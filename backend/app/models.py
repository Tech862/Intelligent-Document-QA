from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    documents = db.relationship("Document", backref="owner", cascade="all, delete-orphan", lazy=True)
    queries = db.relationship("Query", backref="owner", cascade="all, delete-orphan", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    stored_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(12), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="processing")
    processing_stage = db.Column(db.String(32), nullable=False, default="uploading")
    error_message = db.Column(db.String(500))
    collection_id = db.Column(db.Integer, db.ForeignKey("collection.id", ondelete="SET NULL"))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    chunks = db.relationship("Chunk", backref="document", cascade="all, delete-orphan", lazy=True)

    @property
    def chunk_count(self):
        return len(self.chunks)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "status": self.status,
            "processing_stage": self.processing_stage,
            "error_message": self.error_message,
            "collection_id": self.collection_id,
            "chunk_count": self.chunk_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Chunk(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("document.id"), nullable=False, index=True)
    text = db.Column(db.Text, nullable=False)
    page = db.Column(db.Integer)
    embedding = db.Column(db.JSON, nullable=False)
    ordinal = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class Query(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    sources = db.Column(db.JSON, nullable=False, default=list)
    model = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "sources": self.sources,
            "model": self.model,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PasswordReset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True, index=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)


class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    documents = db.relationship("Document", backref="collection", lazy=True)

    @property
    def document_count(self):
        return len(self.documents)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "document_count": self.document_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
