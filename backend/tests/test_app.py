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
