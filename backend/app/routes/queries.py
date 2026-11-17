from datetime import datetime, timedelta, timezone

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, select

from ..extensions import db
from ..models import Chunk, Collection, Document, Query, User
from ..services.answering import generate_answer
from ..services.embeddings import embeddings
from ..services.vector_store import vector_store
from . import api


MAX_SOURCES = 5


def current_user():
    try:
        return db.session.get(User, int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None


def retrieve(question, user_id, document_ids=None):
    question_vector = embeddings.encode([question])[0]
    return vector_store.similarity_search(user_id, question_vector, top_k=MAX_SOURCES, document_ids=document_ids, query_text=question)


@api.post("/queries")
@jwt_required()
def create_query():
    user = current_user()
    payload = request.get_json(silent=True) or {}
    question = str(payload.get("question", "")).strip()
    if not question or len(question) > 2_000:
        return jsonify(error="Enter a question between 1 and 2,000 characters."), 400
    requested_ids = payload.get("document_ids") or []
    if not isinstance(requested_ids, list) or any(not isinstance(value, int) or isinstance(value, bool) for value in requested_ids):
        return jsonify(error="document_ids must be a list of document IDs."), 400
    if requested_ids:
        owned_count = db.session.scalar(
            select(func.count(Document.id)).where(Document.user_id == user.id, Document.status == "ready", Document.id.in_(requested_ids))
        )
        if owned_count != len(set(requested_ids)):
            return jsonify(error="One or more selected sources are unavailable."), 400

    sources = retrieve(question, user.id, requested_ids or None)
    if not sources:
        return jsonify(error="Add at least one processed document before asking a question."), 400
    answer, model_name = generate_answer(question, sources)
    query = Query(user_id=user.id, question=question, answer=answer, sources=sources, model=model_name)
    db.session.add(query)
    db.session.commit()
    return jsonify(query=query.to_dict(), answer=answer, sources=sources, model=model_name), 201


@api.get("/queries")
@jwt_required()
def list_queries():
    user = current_user()
    queries = db.session.scalars(select(Query).where(Query.user_id == user.id).order_by(Query.created_at.desc()).limit(100)).all()
    return jsonify(queries=[query.to_dict() for query in queries])


@api.get("/stats")
@jwt_required()
def stats():
    user = current_user()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=6)
    activity_queries = db.session.scalars(
        select(Query.created_at).where(Query.user_id == user.id, Query.created_at >= start)
    ).all()
    counts = {}
    for created_at in activity_queries:
        counts[created_at.date().isoformat()] = counts.get(created_at.date().isoformat(), 0) + 1
    activity = [
        {"day": (start + timedelta(days=offset)).strftime("%a"), "count": counts.get((start + timedelta(days=offset)).date().isoformat(), 0)}
        for offset in range(7)
    ]
    document_count = db.session.scalar(select(func.count(Document.id)).where(Document.user_id == user.id)) or 0
    chunk_count = db.session.scalar(
        select(func.count(Chunk.id)).join(Document).where(Document.user_id == user.id, Document.status == "ready")
    ) or 0
    query_count = db.session.scalar(select(func.count(Query.id)).where(Query.user_id == user.id)) or 0
    collection_count = db.session.scalar(select(func.count(Collection.id)).where(Collection.user_id == user.id)) or 0
    return jsonify(document_count=document_count, chunk_count=chunk_count, query_count=query_count, collection_count=collection_count, activity=activity)
