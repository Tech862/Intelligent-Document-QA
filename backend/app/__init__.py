import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import inspect, text

from .extensions import db, jwt


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "local-development-key-change-me"),
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "local-jwt-key-change-me"),
        JWT_ACCESS_TOKEN_EXPIRES=int(os.getenv("JWT_ACCESS_TOKEN_SECONDS", "3600")),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///researchvault.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=25 * 1024 * 1024,
        UPLOAD_FOLDER=os.getenv("UPLOAD_FOLDER", str(Path(app_root()) / "uploads")),
        FRONTEND_ORIGIN=os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        SMTP_HOST=os.getenv("SMTP_HOST", ""),
        SMTP_PORT=int(os.getenv("SMTP_PORT", "587")),
        SMTP_USERNAME=os.getenv("SMTP_USERNAME", ""),
        SMTP_PASSWORD=os.getenv("SMTP_PASSWORD", ""),
        SMTP_FROM=os.getenv("SMTP_FROM", ""),
        SMTP_USE_TLS=os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    )
    if test_config:
        app.config.update(test_config)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    frontend_origins = {app.config["FRONTEND_ORIGIN"], "http://localhost:5173", "http://127.0.0.1:5173"}
    CORS(app, resources={r"/api/*": {"origins": list(frontend_origins)}}, supports_credentials=False)
    db.init_app(app)
    jwt.init_app(app)

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_payload):
        return jsonify(error="Your session has expired. Please sign in again.", code="token_expired"), 401

    @jwt.invalid_token_loader
    def invalid_token(_error):
        return jsonify(error="Your session token is invalid. Please sign in again.", code="token_invalid"), 401

    @jwt.unauthorized_loader
    def missing_token(_error):
        return jsonify(error="Sign in to access this resource.", code="authentication_required"), 401

    from . import models
    from .routes import api

    app.register_blueprint(api, url_prefix="/api")
    with app.app_context():
        db.create_all()
        migrate_legacy_schema(db.engine)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "ResearchVault AI API"})

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="Files must be 25 MB or smaller."), 413

    return app


def app_root():
    return Path(__file__).resolve().parents[1]


def migrate_legacy_schema(engine):
    with engine.begin() as connection:
        tables = set(inspect(connection).get_table_names())
        if "document" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("document")}
            if "collection_id" not in columns:
                connection.execute(text("ALTER TABLE document ADD COLUMN collection_id INTEGER REFERENCES collection(id) ON DELETE SET NULL"))
            if "processing_stage" not in columns:
                connection.execute(text("ALTER TABLE document ADD COLUMN processing_stage VARCHAR(32) NOT NULL DEFAULT 'ready'"))
                connection.execute(text("UPDATE document SET processing_stage = CASE WHEN status = 'error' THEN 'failed' WHEN status = 'processing' THEN 'extracting_text' ELSE 'ready' END"))
        if "chunk" in tables:
            columns = {column["name"] for column in inspect(connection).get_columns("chunk")}
            if "created_at" not in columns:
                timestamp_type = "TIMESTAMP WITH TIME ZONE" if engine.dialect.name == "postgresql" else "DATETIME"
                connection.execute(text(f"ALTER TABLE chunk ADD COLUMN created_at {timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP"))
