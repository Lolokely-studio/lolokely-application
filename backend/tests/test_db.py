"""Semantique transactionnelle et liberation des connexions de `db.get_connection`.

Le pool est stubbe : ces tests ne touchent ni le reseau ni un secret, et
peuvent donc tourner partout (CI, machine sans acces Supabase).

Ce qui est verrouille ici, c'est que `get_connection()` reproduise exactement
la semantique de `with conn:` de psycopg2 (commit en sortie normale, rollback
sur exception) tout en rendant la connexion au pool, ce que psycopg2 ne fait
pas. Une regression sur ce point est silencieuse et corrompt des donnees.
"""

import pytest

import db as dbmod


class FakeCursor:
    def __init__(self, conn, **kwargs):
        self.conn = conn
        self.kwargs = kwargs
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False


class FakeConn:
    def __init__(self, rollback_raises=False):
        self.commits = 0
        self.rollbacks = 0
        self.rollback_raises = rollback_raises
        self.cursors = []

    def commit(self):
        self.commits += 1

    def rollback(self):
        if self.rollback_raises:
            raise RuntimeError("server closed the connection unexpectedly")
        self.rollbacks += 1

    def cursor(self, **kwargs):
        cursor = FakeCursor(self, **kwargs)
        self.cursors.append(cursor)
        return cursor


class FakePool:
    def __init__(self, conn):
        self.conn = conn
        self.borrowed = 0
        self.returned = []  # valeurs du parametre `close` a chaque putconn

    def getconn(self):
        self.borrowed += 1
        return self.conn

    def putconn(self, conn, close=False):
        self.returned.append(close)


@pytest.fixture
def stub_pool(monkeypatch):
    """Remplace le pool reel par un double. Retourne (pool, connexion)."""

    def _make(rollback_raises=False):
        conn = FakeConn(rollback_raises=rollback_raises)
        pool = FakePool(conn)
        monkeypatch.setattr(dbmod, "_get_pool", lambda: pool)
        return pool, conn

    return _make


@pytest.fixture
def clean_db_env(monkeypatch):
    """Vide toutes les variables DB, canoniques comme heritees."""
    for name in (
        "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME",
        "USER_DB", "PASSWORD_DB", "HOST", "PORT", "DBNAME", "RENDER",
    ):
        monkeypatch.delenv(name, raising=False)


# --- Semantique transactionnelle -------------------------------------------


def test_normal_exit_commits_and_recycles_connection(stub_pool):
    pool, conn = stub_pool()

    with dbmod.get_connection():
        pass

    assert conn.commits == 1
    assert conn.rollbacks == 0
    assert pool.returned == [False], "la connexion doit etre recyclee, pas fermee"


def test_early_return_inside_block_still_commits(stub_pool):
    """Motif tres present dans les routes, ex. routes/auth.py:34 qui renvoie
    un 409 depuis l'interieur du bloc `with`."""
    pool, conn = stub_pool()

    def route_like():
        with dbmod.get_connection():
            return "409"

    assert route_like() == "409"
    assert conn.commits == 1
    assert pool.returned == [False]


def test_exception_rolls_back_and_propagates(stub_pool):
    pool, conn = stub_pool()

    with pytest.raises(ValueError, match="boom"):
        with dbmod.get_connection():
            raise ValueError("boom")

    assert conn.rollbacks == 1
    assert conn.commits == 0, "aucun commit ne doit avoir lieu apres une exception"
    assert pool.returned == [False]


def test_dead_connection_is_closed_not_recycled(stub_pool):
    """Si le rollback lui-meme echoue, la connexion est inutilisable : la
    remettre dans le pool contaminerait les requetes suivantes."""
    pool, conn = stub_pool(rollback_raises=True)

    with pytest.raises(ValueError):
        with dbmod.get_connection():
            raise ValueError("boom")

    assert pool.returned == [True], "la connexion morte doit etre fermee"


def test_explicit_commit_inside_block_is_idempotent(stub_pool):
    """Les routes appellent deja conn.commit() explicitement (ex.
    routes/tasks.py:192). Le commit final ne doit pas poser probleme."""
    _, conn = stub_pool()

    with dbmod.get_connection() as conn_yielded:
        conn_yielded.commit()

    assert conn.commits == 2


def test_connection_is_always_returned_even_if_commit_fails(stub_pool):
    pool, conn = stub_pool()
    conn.commit = _raise_once

    with pytest.raises(RuntimeError):
        with dbmod.get_connection():
            pass

    assert len(pool.returned) == 1, "la connexion ne doit jamais fuir"


def _raise_once():
    raise RuntimeError("commit failed")


# --- Compatibilite avec les 65 sites d'appel existants ----------------------


def test_real_call_site_syntax_with_cursor(stub_pool):
    """`with get_connection() as conn, conn.cursor(...) as cur:` est l'une des
    deux seules formes utilisees dans le code. Elle doit rester intacte."""
    pool, conn = stub_pool()

    with dbmod.get_connection() as c, c.cursor(cursor_factory="RealDictCursor") as cur:
        assert cur.conn is conn
        assert cur.kwargs == {"cursor_factory": "RealDictCursor"}

    assert conn.cursors[0].closed
    assert conn.commits == 1
    assert pool.returned == [False]


# --- Resolution de la configuration ----------------------------------------


def test_db_port_falls_back_to_legacy_port_outside_render(clean_db_env, monkeypatch):
    monkeypatch.setenv("PORT", "5432")
    assert dbmod._db_port() == "5432"


def test_db_port_refuses_legacy_port_on_render(clean_db_env, monkeypatch):
    """Sur Render, PORT est le port HTTP du service, pas celui de Postgres."""
    monkeypatch.setenv("PORT", "10000")
    monkeypatch.setenv("RENDER", "true")

    with pytest.raises(RuntimeError, match="DB_PORT"):
        dbmod._db_port()


def test_db_port_explicit_value_wins_on_render(clean_db_env, monkeypatch):
    monkeypatch.setenv("PORT", "10000")
    monkeypatch.setenv("RENDER", "true")
    monkeypatch.setenv("DB_PORT", "6543")

    assert dbmod._db_port() == "6543"


def test_missing_configuration_names_the_missing_variables(clean_db_env):
    with pytest.raises(RuntimeError) as excinfo:
        dbmod._connection_params()

    message = str(excinfo.value)
    for field in ("dbname", "host", "password", "port", "user"):
        assert field in message, f"{field} devrait etre signale comme manquant"


def test_legacy_env_names_are_still_accepted(clean_db_env, monkeypatch):
    """Le .env local existant doit continuer de fonctionner sans modification."""
    monkeypatch.setenv("USER_DB", "u")
    monkeypatch.setenv("PASSWORD_DB", "p")
    monkeypatch.setenv("HOST", "h")
    monkeypatch.setenv("PORT", "5432")
    monkeypatch.setenv("DBNAME", "d")

    params = dbmod._connection_params()

    assert params["user"] == "u"
    assert params["password"] == "p"
    assert params["host"] == "h"
    assert params["port"] == "5432"
    assert params["dbname"] == "d"


def test_canonical_names_take_precedence_over_legacy(clean_db_env, monkeypatch):
    monkeypatch.setenv("USER_DB", "legacy")
    monkeypatch.setenv("DB_USER", "canonical")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "h")
    monkeypatch.setenv("DB_PORT", "6543")
    monkeypatch.setenv("DB_NAME", "d")

    assert dbmod._connection_params()["user"] == "canonical"


def test_sslmode_is_always_required(clean_db_env, monkeypatch):
    monkeypatch.setenv("DB_USER", "u")
    monkeypatch.setenv("DB_PASSWORD", "p")
    monkeypatch.setenv("DB_HOST", "h")
    monkeypatch.setenv("DB_PORT", "6543")
    monkeypatch.setenv("DB_NAME", "d")

    assert dbmod._connection_params()["sslmode"] == "require"
