from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AuthIn, AuthOut, AuthUser
from app.security import claim_existing_data, create_token, get_current_user, hash_password, normalize_email, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def new_user_id() -> str:
    return f"u_{uuid4().hex[:12]}"


def auth_out(user: User) -> AuthOut:
    return AuthOut(token=create_token(user.id), user=AuthUser(email=user.email, name=user.name))


@router.post("/register", response_model=AuthOut, status_code=201)
def register(payload: AuthIn, db: Session = Depends(get_db)) -> AuthOut:
    email = normalize_email(payload.email)
    password = payload.password
    name = (payload.name or "").strip()
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=new_user_id(),
        email=email,
        password_hash=hash_password(password),
        name=name,
        daily_goal=10,
        streak_days=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    claim_existing_data(db, user)
    db.commit()
    db.refresh(user)
    return auth_out(user)


@router.post("/login", response_model=AuthOut)
def login(payload: AuthIn, db: Session = Depends(get_db)) -> AuthOut:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return auth_out(user)


@router.get("/me", response_model=AuthUser)
def me(user: User = Depends(get_current_user)) -> User:
    return user
