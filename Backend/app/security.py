from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Deck, Profile, Sentence, Song, User, Word

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: str) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    return jwt.encode({"sub": user_id, "exp": expires}, settings.jwt_secret, algorithm="HS256")


def normalize_email(email: str) -> str:
    value = email.strip().lower()
    local, separator, domain = value.partition("@")
    if not separator or not local or "." not in domain or " " in value:
        raise HTTPException(status_code=422, detail="Invalid email")
    return value


def claim_existing_data(db: Session, user: User) -> None:
    others = db.scalar(select(func.count()).select_from(User).where(User.id != user.id)) or 0
    if others:
        return
    for model in (Word, Sentence, Song, Deck):
        db.execute(update(model).where(model.user_id.is_(None)).values(user_id=user.id))
    profile = db.get(Profile, 1)
    if profile is None:
        return
    user.daily_goal = profile.daily_goal
    user.streak_days = profile.streak_days


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    settings = get_settings()
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Not authenticated") from None
    user_id = payload.get("sub")
    user = db.get(User, user_id) if isinstance(user_id, str) else None
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
