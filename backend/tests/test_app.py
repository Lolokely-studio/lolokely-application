"""Application configuration: /healthz endpoint and CORS guard.

None of these tests touch the database or the network. The required variables
are set explicitly so the suite runs without a .env file.
"""

import contextlib

import pytest

import app as appmod

REQUIRED_ENV = {
    "SECRET_KEY": "test-secret",
    "JWT_SECRET_KEY": "test-jwt-secret",
    "CORS_ORIGINS": "http://localhost:5173",
}


@pytest.fixture
def env(monkeypatch):
    for key, value in REQUIRED_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("CORS_ALLOW_VERCEL_PREVIEWS", raising=False)
    return monkeypatch


@pytest.fixture
def client(env):
    return appmod.create_app().test_client()


@contextlib.contextmanager
def _unreachable_database():
    raise RuntimeError("could not connect to server")
    yield  # pragma: no cover


def test_healthz_returns_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_healthz_does_not_touch_the_database_by_default(client, monkeypatch):
    """A health check depending on Supabase would make a healthy backend
    restart in a loop during a provider outage."""
    import db as dbmod

    monkeypatch.setattr(dbmod, "get_connection", _unreachable_database)

    assert client.get("/healthz").status_code == 200


def test_healthz_deep_check_reports_database_failure(client, monkeypatch):
    import db as dbmod

    monkeypatch.setattr(dbmod, "get_connection", _unreachable_database)

    response = client.get("/healthz?db=1")

    assert response.status_code == 503
    assert response.get_json()["status"] == "error"


PREVIEW_ORIGIN = "https://lolokely-git-feat-abc123.vercel.app"


def _preflight(client, origin):
    return client.options(
        "/api/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )


def test_missing_cors_origins_fails_fast(env):
    env.setenv("CORS_ORIGINS", "")

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        appmod.create_app()


def test_unset_cors_origins_fails_fast(env):
    """The real production failure mode: the variable is absent, not empty.
    Without the guard this raises AttributeError on None.split(',')."""
    env.delenv("CORS_ORIGINS", raising=False)

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        appmod.create_app()


def test_cors_origins_with_only_separators_fails_fast(env):
    env.setenv("CORS_ORIGINS", " , , ")

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        appmod.create_app()


def test_configured_origin_is_allowed(client):
    response = _preflight(client, "http://localhost:5173")

    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_vercel_preview_origin_is_rejected_by_default(client):
    """Opening up the whole Vercel platform is a choice, not a default."""
    response = _preflight(client, PREVIEW_ORIGIN)

    assert "Access-Control-Allow-Origin" not in response.headers


def test_vercel_preview_origin_is_allowed_when_enabled(env):
    env.setenv("CORS_ALLOW_VERCEL_PREVIEWS", "true")
    client = appmod.create_app().test_client()

    response = _preflight(client, PREVIEW_ORIGIN)

    assert response.headers.get("Access-Control-Allow-Origin") == PREVIEW_ORIGIN
