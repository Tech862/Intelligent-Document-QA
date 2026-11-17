import hashlib
import re
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlencode

from flask import current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from ..extensions import db
from ..models import PasswordReset, User
from . import api


def find_user():
    try:
        return db.session.get(User, int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None


def issue_token(user):
    return {"access_token": create_access_token(identity=str(user.id)), "user": user.to_dict()}


def send_password_reset_email(user, token):
    reset_url = f"{current_app.config['FRONTEND_ORIGIN'].rstrip('/')}/reset-password?{urlencode({'token': token})}"
    message = EmailMessage()
    message["Subject"] = "Reset your ResearchVault AI password"
    message["From"] = current_app.config["SMTP_FROM"] or current_app.config["SMTP_USERNAME"]
    message["To"] = user.email
    message.set_content(
        f"Hello {user.name},\n\nUse this link to set a new ResearchVault AI password. "
        f"It expires in 30 minutes and can only be used once:\n\n{reset_url}\n\n"
        "If you did not request a reset, you can ignore this email."
    )
    with smtplib.SMTP(current_app.config["SMTP_HOST"], current_app.config["SMTP_PORT"], timeout=10) as server:
        if current_app.config["SMTP_USE_TLS"]:
            server.starttls(context=ssl.create_default_context())
        if current_app.config["SMTP_USERNAME"]:
            server.login(current_app.config["SMTP_USERNAME"], current_app.config["SMTP_PASSWORD"])
        server.send_message(message)


@api.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    if len(name) < 2 or len(name) > 120:
        return jsonify(error="Enter a name between 2 and 120 characters."), 400
    if len(email) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters."), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="An account with that email already exists."), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(issue_token(user)), 201


@api.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify(error="The email or password is incorrect."), 401
    return jsonify(issue_token(user))


@api.get("/auth/me")
@jwt_required()
def me():
    user = find_user()
    if not user:
        return jsonify(error="Account not found."), 404
    return jsonify(user=user.to_dict())


@api.post("/auth/logout")
@jwt_required()
def logout():
    return jsonify(message="Signed out. Remove the access token from the client."), 200


@api.post("/auth/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    if len(email) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if not current_app.config["TESTING"] and not current_app.config["SMTP_HOST"]:
        return jsonify(error="Password reset email delivery is not configured on this server."), 503

    user = User.query.filter_by(email=email).first()
    message = "If an account exists for that email, reset instructions will be sent."
    if not user:
        return jsonify(message=message)

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    previous = db.session.scalar(db.select(PasswordReset).where(PasswordReset.user_id == user.id))
    if previous:
        db.session.delete(previous)
    reset = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.session.add(reset)
    db.session.commit()

    if current_app.config["TESTING"]:
        return jsonify(message=message, reset_token=token)
    try:
        send_password_reset_email(user, token)
    except (OSError, smtplib.SMTPException) as error:
        db.session.delete(reset)
        db.session.commit()
        current_app.logger.exception("Password reset email could not be sent: %s", error)
        return jsonify(error="Password reset email could not be sent. Please try again later."), 503
    return jsonify(message=message)


@api.post("/auth/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", ""))
    password = str(payload.get("password", ""))
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters."), 400
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    reset = PasswordReset.query.filter_by(token_hash=token_hash).first()
    if not reset:
        return jsonify(error="This password reset link is invalid or has already been used."), 400
    expires_at = reset.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        db.session.delete(reset)
        db.session.commit()
        return jsonify(error="This password reset link has expired. Request a new one."), 400

    user = db.session.get(User, reset.user_id)
    if not user:
        db.session.delete(reset)
        db.session.commit()
        return jsonify(error="This password reset link is invalid or has already been used."), 400
    user.set_password(password)
    db.session.delete(reset)
    db.session.commit()
    return jsonify(message="Your password has been updated. Sign in with your new password.")
