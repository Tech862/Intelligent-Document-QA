import os
import uuid
from pathlib import Path

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import select
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import Chunk, Collection, Document, User
from ..services.documents import SUPPORTED_EXTENSIONS, chunk_pages, extract_pages
from ..services.embeddings import embeddings
from ..services.vector_store import vector_store
from . import api


def current_user():
    try:
        return db.session.get(User, int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None


@api.get("/documents")
@jwt_required()
def list_documents():
    user = current_user()
    documents = db.session.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())).all()
    return jsonify(documents=[document.to_dict() for document in documents])


@api.post("/documents")
@jwt_required()
def upload_document():
    user = current_user()
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return jsonify(error="Choose a document to upload."), 400
    safe_name = secure_filename(uploaded.filename)
    extension = Path(safe_name).suffix.lower().lstrip(".")
    if not safe_name or extension not in SUPPORTED_EXTENSIONS:
        return jsonify(error="Choose a PDF, DOCX, or TXT file."), 415
    content = uploaded.read()
    if not content:
        return jsonify(error="This document is empty."), 400
    if extension == "txt" and b"\x00" in content:
        return jsonify(error="This TXT file does not contain readable text."), 400

    upload_dir = Path(current_app.config["UPLOAD_FOLDER"]) / str(user.id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / f"{uuid.uuid4().hex}.{extension}"
    stored_path.write_bytes(content)
    document = Document(
        user_id=user.id,
        filename=safe_name,
        stored_path=str(stored_path),
        file_type=extension,
        file_size=len(content),
        status="processing",
        processing_stage="uploading",
    )
    db.session.add(document)
    db.session.commit()

    document_id = document.id
    try:
        document.processing_stage = "extracting_text"
        db.session.commit()
        pages = extract_pages(stored_path, extension)
        document.processing_stage = "chunking"
        db.session.commit()
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError("No readable text was found in this document.")
        document.processing_stage = "generating_embeddings"
        db.session.commit()
        vectors = embeddings.encode([chunk["text"] for chunk in chunks])
        document.processing_stage = "indexing"
        db.session.commit()
        chunk_records = [
            Chunk(document_id=document.id, text=chunk["text"], page=chunk["page"], ordinal=chunk["ordinal"], embedding=vector)
            for chunk, vector in zip(chunks, vectors)
        ]
        db.session.add_all(chunk_records)
        document.status = "ready"
        document.processing_stage = "ready"
        document.error_message = None
        db.session.commit()
        try:
            vector_store.add_documents(user.id, chunk_records)
        except Exception:
            vector_store.delete_document(user.id, document_id)
            current_app.logger.exception("FAISS index refresh failed for document %s", document_id)
    except Exception as error:
        db.session.rollback()
        document = db.session.get(Document, document_id)
        if document:
            document.status = "error"
            document.processing_stage = "failed"
            document.error_message = str(error)[:500]
            db.session.commit()
        return jsonify(error=f"Document processing failed: {error}"), 422

    return jsonify(document=document.to_dict()), 201


@api.delete("/documents/<int:document_id>")
@jwt_required()
def delete_document(document_id):
    user = current_user()
    document = db.session.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not document:
        return jsonify(error="Document not found."), 404
    stored_path = document.stored_path
    db.session.delete(document)
    db.session.commit()
    vector_store.delete_document(user.id, document_id)
    try:
        Path(stored_path).unlink(missing_ok=True)
    except OSError:
        current_app.logger.warning("Could not remove document file: %s", os.path.basename(stored_path))
    return jsonify(message="Document and its indexed passages were removed.")


@api.patch("/documents/<int:document_id>")
@jwt_required()
def assign_collection(document_id):
    user = current_user()
    payload = request.get_json(silent=True) or {}
    if "collection_id" not in payload:
        return jsonify(error="Provide a collection_id, or null to remove the assignment."), 400
    collection_id = payload["collection_id"]
    if collection_id is not None and (not isinstance(collection_id, int) or isinstance(collection_id, bool)):
        return jsonify(error="collection_id must be an integer or null."), 400

    document = db.session.scalar(select(Document).where(Document.id == document_id, Document.user_id == user.id))
    if not document:
        return jsonify(error="Document not found."), 404
    if collection_id is not None:
        collection = db.session.scalar(select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id))
        if not collection:
            return jsonify(error="Collection not found."), 404
    document.collection_id = collection_id
    db.session.commit()
    return jsonify(document=document.to_dict())
