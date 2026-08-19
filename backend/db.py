import os
import threading
from contextlib import contextmanager

from psycopg2 import pool as psycopg2_pool
from dotenv import load_dotenv

load_dotenv()

# Noms canoniques DB_*, avec repli sur les anciens noms pour le dev local.
# DB_PORT n'a volontairement pas de repli sur PORT en environnement Render :
# PORT y est la variable reservee du port HTTP du service, pas celle de Postgres.
_LEGACY = {
    "DB_USER": "USER_DB",
    "DB_PASSWORD": "PASSWORD_DB",
    "DB_HOST": "HOST",
    "DB_NAME": "DBNAME",
}

# Doit rester >= au nombre de threads gunicorn par worker : psycopg2 leve
# PoolError quand le pool est epuise, il n'attend pas de connexion libre.
POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
POOL_MAX = int(os.getenv("DB_POOL_MAX", "5"))

_pool = None
_pool_pid = None
_pool_lock = threading.Lock()


def _setting(name):
    value = os.getenv(name)
    if value:
        return value
    legacy = _LEGACY.get(name)
    return os.getenv(legacy) if legacy else None


def _db_port():
    port = os.getenv("DB_PORT")
    if port:
        return port
    if os.getenv("RENDER"):
        raise RuntimeError(
            "DB_PORT must be set on Render (PORT is reserved for the service HTTP port)"
        )
    return os.getenv("PORT")


def _connection_params():
    params = {
        "user": _setting("DB_USER"),
        "password": _setting("DB_PASSWORD"),
        "host": _setting("DB_HOST"),
        "port": _db_port(),
        "dbname": _setting("DB_NAME"),
    }
    missing = [name for name, value in params.items() if not value]
    if missing:
        raise RuntimeError(
            "Missing database configuration: " + ", ".join(sorted(missing))
        )
    params["sslmode"] = "require"
    return params


def _get_pool():
    """Pool paresseux, recree apres un fork (gunicorn) car les sockets
    heritees du processus parent ne sont pas partageables."""
    global _pool, _pool_pid

    pid = os.getpid()
    if _pool is not None and _pool_pid == pid:
        return _pool

    with _pool_lock:
        if _pool is None or _pool_pid != pid:
            _pool = psycopg2_pool.ThreadedConnectionPool(
                POOL_MIN, POOL_MAX, **_connection_params()
            )
            _pool_pid = pid
    return _pool


@contextmanager
def get_connection():
    """Emprunte une connexion au pool.

    Commit en sortie normale, rollback si le bloc leve, et rend toujours la
    connexion au pool. Meme semantique transactionnelle que `with conn:` de
    psycopg2, mais sans fuite de connexion.
    """
    pool = _get_pool()
    conn = pool.getconn()
    broken = False
    try:
        yield conn
        conn.commit()
    except Exception:
        broken = True
        try:
            conn.rollback()
            broken = False
        except Exception:
            pass
        raise
    finally:
        try:
            pool.putconn(conn, close=broken)
        except Exception:
            pass


def close_pool():
    """Ferme toutes les connexions du pool du processus courant."""
    global _pool, _pool_pid

    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None
            _pool_pid = None
