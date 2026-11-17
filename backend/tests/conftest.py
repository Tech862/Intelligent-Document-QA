import pytest

from app import create_app
from app.extensions import db
from app.services.vector_store import vector_store


@pytest.fixture
def app(tmp_path):
    application = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "JWT_SECRET_KEY": "test-only-jwt-secret-key-with-more-than-32-bytes",
        "SECRET_KEY": "test-only-flask-secret-key-with-more-than-32-bytes",
        "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        "FRONTEND_ORIGIN": "http://localhost:5173",
    })
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()
        vector_store.clear()


@pytest.fixture
def client(app):
    return app.test_client()


def register(client, name="Researcher", email="researcher@example.com"):
    response = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "research-pass-123",
    })
    assert response.status_code == 201
    return response.json["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
