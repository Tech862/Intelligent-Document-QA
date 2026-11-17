from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import select, update

from ..extensions import db
from ..models import Collection, Document, User
from . import api


def current_user():
    try:
        return db.session.get(User, int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None


@api.get("/collections")
@jwt_required()
def list_collections():
    user = current_user()
    collections = db.session.scalars(
        select(Collection).where(Collection.user_id == user.id).order_by(Collection.created_at.desc())
    ).all()
    return jsonify(collections=[collection.to_dict() for collection in collections])


@api.post("/collections")
@jwt_required()
def create_collection():
    user = current_user()
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    description = str(payload.get("description", "")).strip()
    if not name or len(name) > 120:
        return jsonify(error="Collection names must be between 1 and 120 characters."), 400
    if len(description) > 500:
        return jsonify(error="Descriptions must be 500 characters or fewer."), 400
    existing = db.session.scalar(
        select(Collection).where(Collection.user_id == user.id, Collection.name.ilike(name))
    )
    if existing:
        return jsonify(error="A collection with that name already exists."), 409
    collection = Collection(user_id=user.id, name=name, description=description)
    db.session.add(collection)
    db.session.commit()
    return jsonify(collection=collection.to_dict()), 201


@api.delete("/collections/<int:collection_id>")
@jwt_required()
def delete_collection(collection_id):
    user = current_user()
    collection = db.session.scalar(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    )
    if not collection:
        return jsonify(error="Collection not found."), 404
    db.session.execute(
        update(Document).where(Document.collection_id == collection.id).values(collection_id=None)
    )
    db.session.delete(collection)
    db.session.commit()
    return jsonify(message="Collection removed. Documents remain in your library.")
