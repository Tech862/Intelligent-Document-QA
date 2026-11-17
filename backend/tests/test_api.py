from io import BytesIO
from datetime import timedelta

from flask_jwt_extended import create_access_token
from docx import Document as WordDocument
from sqlalchemy import select

from .conftest import auth_headers, register
from app.extensions import db
from app.models import Chunk
from app.services.vector_store import vector_store
from app.services.answering import generate_answer


def test_authentication_and_account_validation(client):
    response = client.post("/api/auth/register", json={
        "name": "Rahul",
        "email": "Rahul@example.com",
        "password": "long-enough-password",
    })
    assert response.status_code == 201
    token = response.json["access_token"]
    assert response.json["user"]["email"] == "rahul@example.com"
    assert client.get("/api/auth/me", headers=auth_headers(token)).json["user"]["name"] == "Rahul"
    assert client.post("/api/auth/register", json={
        "name": "Rahul",
        "email": "rahul@example.com",
        "password": "long-enough-password",
    }).status_code == 409
    assert client.post("/api/auth/login", json={
        "email": "rahul@example.com",
        "password": "incorrect-password",
    }).status_code == 401


def test_document_ingestion_citations_history_and_delete(client):
    token = register(client)
    headers = auth_headers(token)
    content = (
        "Photosynthesis occurs in chloroplasts. Chlorophyll absorbs light energy during "
        "photosynthesis, and plants use that energy to convert water and carbon dioxide "
        "into glucose and oxygen. The process stores chemical energy in glucose."
    ).encode()
    uploaded = client.post(
        "/api/documents",
        headers=headers,
        data={"file": (BytesIO(content), "plant-notes.txt")},
        content_type="multipart/form-data",
    )
    assert uploaded.status_code == 201
    document = uploaded.json["document"]
    assert document["status"] == "ready"
    assert document["chunk_count"] >= 1

    answer = client.post("/api/queries", headers=headers, json={
        "question": "Which pigment absorbs light energy during photosynthesis?",
    })
    assert answer.status_code == 201
    assert "Chlorophyll" in answer.json["answer"]
    assert answer.json["model"] == "Extractive"
    assert answer.json["sources"][0]["filename"] == "plant-notes.txt"
    assert answer.json["sources"][0]["document_name"] == "plant-notes.txt"
    assert answer.json["sources"][0]["chunk_id"]
    assert answer.json["sources"][0]["created_at"]

    history = client.get("/api/queries", headers=headers)
    assert len(history.json["queries"]) == 1
    assert history.json["queries"][0]["sources"][0]["filename"] == "plant-notes.txt"
    stats = client.get("/api/stats", headers=headers)
    assert stats.json["document_count"] == 1
    assert stats.json["chunk_count"] >= 1
    assert stats.json["query_count"] == 1
    assert len(stats.json["activity"]) == 7

    assert client.delete(f"/api/documents/{document['id']}", headers=headers).status_code == 200
    assert client.get("/api/documents", headers=headers).json["documents"] == []


def test_documents_and_queries_are_private_to_each_account(client):
    first_token = register(client, "First User", "first@example.com")
    second_token = register(client, "Second User", "second@example.com")
    client.post("/api/documents", headers=auth_headers(first_token), data={
        "file": (BytesIO(b"Private notes about orbital mechanics and satellite motion."), "private.txt"),
    }, content_type="multipart/form-data")

    assert client.get("/api/documents", headers=auth_headers(second_token)).json["documents"] == []
    response = client.post("/api/queries", headers=auth_headers(second_token), json={
        "question": "Tell me about orbital mechanics.",
    })
    assert response.status_code == 400


def test_unauthenticated_routes_are_protected(client):
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/queries").status_code == 401
    assert client.get("/api/stats").status_code == 401


def test_password_reset_is_private_single_use_and_changes_password(client):
    register(client, "Researcher", "reset@example.com")
    known = client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})
    assert known.status_code == 200
    assert known.json["message"] == unknown.json["message"]
    reset_token = known.json["reset_token"]

    reset = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "another-long-password",
    })
    assert reset.status_code == 200
    assert client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "a-third-long-password",
    }).status_code == 400
    assert client.post("/api/auth/login", json={
        "email": "reset@example.com",
        "password": "research-pass-123",
    }).status_code == 401
    assert client.post("/api/auth/login", json={
        "email": "reset@example.com",
        "password": "another-long-password",
    }).status_code == 200


def test_invalid_and_expired_jwts_return_clear_errors(client, app):
    invalid = client.get("/api/auth/me", headers=auth_headers("not-a-valid-token"))
    assert invalid.status_code == 401
    assert invalid.json["code"] == "token_invalid"

    with app.app_context():
        expired_token = create_access_token(identity="1", expires_delta=timedelta(seconds=-1))
    expired = client.get("/api/auth/me", headers=auth_headers(expired_token))
    assert expired.status_code == 401
    assert expired.json["code"] == "token_expired"


def test_collections_count_assignments_and_user_isolation(client):
    owner_token = register(client, "Collection Owner", "owner@example.com")
    other_token = register(client, "Other User", "other-collection@example.com")
    owner_headers = auth_headers(owner_token)
    collection_response = client.post("/api/collections", headers=owner_headers, json={
        "name": "Literature review",
        "description": "Papers for the current review.",
    })
    assert collection_response.status_code == 201
    collection_id = collection_response.json["collection"]["id"]
    assert client.get("/api/stats", headers=owner_headers).json["collection_count"] == 1
    assert client.post("/api/collections", headers=owner_headers, json={"name": "LITERATURE REVIEW"}).status_code == 409

    uploaded = client.post("/api/documents", headers=owner_headers, data={
        "file": (BytesIO(b"Notes from multiple research papers."), "review.txt"),
    }, content_type="multipart/form-data")
    document_id = uploaded.json["document"]["id"]
    assigned = client.patch(f"/api/documents/{document_id}", headers=owner_headers, json={"collection_id": collection_id})
    assert assigned.status_code == 200
    assert assigned.json["document"]["collection_id"] == collection_id
    listed = client.get("/api/collections", headers=owner_headers).json["collections"]
    assert listed[0]["document_count"] == 1

    other_headers = auth_headers(other_token)
    assert client.delete(f"/api/collections/{collection_id}", headers=other_headers).status_code == 404
    assert client.delete(f"/api/collections/{collection_id}", headers=owner_headers).status_code == 200
    remaining_doc = client.get("/api/documents", headers=owner_headers).json["documents"][0]
    assert remaining_doc["collection_id"] is None
    assert client.get("/api/stats", headers=owner_headers).json["collection_count"] == 0


def test_faiss_index_updates_after_upload_and_delete(client, app):
    token = register(client, "Index Owner", "index-owner@example.com")
    headers = auth_headers(token)
    first = client.post("/api/documents", headers=headers, data={
        "file": (BytesIO(b"Chlorophyll absorbs light during photosynthesis in plant cells."), "plants.txt"),
    }, content_type="multipart/form-data").json["document"]
    client.post("/api/queries", headers=headers, json={"question": "What absorbs light during photosynthesis?"})

    second = client.post("/api/documents", headers=headers, data={
        "file": (BytesIO(b"Mitosis separates duplicated chromosomes into two daughter cells."), "cell-division.txt"),
    }, content_type="multipart/form-data").json["document"]
    owner_id = client.get("/api/auth/me", headers=headers).json["user"]["id"]
    with app.app_context():
        replacement_chunks = db.session.scalars(
            select(Chunk).where(Chunk.document_id == second["id"])
        ).all()
        vector_store.update_document(owner_id, second["id"], replacement_chunks)
    retrieved = client.post("/api/queries", headers=headers, json={"question": "What happens to duplicated chromosomes during mitosis?"})
    assert retrieved.status_code == 201
    assert retrieved.json["sources"][0]["document_id"] == second["id"]

    assert client.delete(f"/api/documents/{second['id']}", headers=headers).status_code == 200
    after_delete = client.post("/api/queries", headers=headers, json={"question": "What absorbs light during photosynthesis?"})
    assert after_delete.status_code == 201
    assert all(source["document_id"] == first["id"] for source in after_delete.json["sources"])


def test_docx_extraction_and_upload_validation(client, app):
    token = register(client, "Document Tester", "docx-tester@example.com")
    headers = auth_headers(token)
    word_file = BytesIO()
    word_document = WordDocument()
    word_document.add_paragraph("Coastal wetlands reduce wave energy and provide habitat for migratory birds.")
    word_document.save(word_file)
    word_file.seek(0)

    response = client.post("/api/documents", headers=headers, data={
        "file": (word_file, "wetlands.docx"),
    }, content_type="multipart/form-data")
    assert response.status_code == 201
    assert response.json["document"]["file_type"] == "docx"
    assert response.json["document"]["processing_stage"] == "ready"
    owner_id = client.get("/api/auth/me", headers=headers).json["user"]["id"]
    with app.app_context():
        index = vector_store._indices[vector_store._cache_key(owner_id)]
        assert len(index.metadata) == response.json["document"]["chunk_count"]
    query = client.post("/api/queries", headers=headers, json={"question": "What do coastal wetlands reduce?"})
    assert query.status_code == 201
    assert "wave energy" in query.json["sources"][0]["content"]
    assert query.json["sources"][0]["page"] is None

    unsupported = client.post("/api/documents", headers=headers, data={
        "file": (BytesIO(b"binary"), "archive.zip"),
    }, content_type="multipart/form-data")
    assert unsupported.status_code == 415
    empty = client.post("/api/documents", headers=headers, data={
        "file": (BytesIO(b""), "empty.txt"),
    }, content_type="multipart/form-data")
    assert empty.status_code == 400
