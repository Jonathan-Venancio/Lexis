from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import ProfileOut, ProfileUpdate
from app.security import get_current_user
from app.streak import local_today, visible_streak

router = APIRouter(prefix="/api/profile", tags=["profile"])


def to_profile(user: User, today: date) -> ProfileOut:
    return ProfileOut(
        name=user.name,
        email=user.email,
        daily_goal=user.daily_goal,
        streak_days=visible_streak(user.streak_days, user.last_study_on, today),
    )


@router.get("", response_model=ProfileOut)
def read_profile(user: User = Depends(get_current_user), today: date = Depends(local_today)) -> ProfileOut:
    return to_profile(user, today)


@router.patch("", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(local_today),
) -> ProfileOut:
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name is required")
        user.name = name
    if "daily_goal" in data and data["daily_goal"] is not None:
        user.daily_goal = data["daily_goal"]
    db.commit()
    db.refresh(user)
    return to_profile(user, today)
