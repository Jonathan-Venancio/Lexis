from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile
from app.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])

PROFILE_ID = 1


def get_profile(db: Session) -> Profile:
    profile = db.get(Profile, PROFILE_ID)
    if profile is None:
        profile = Profile(id=PROFILE_ID, name="", daily_goal=10, streak_days=0)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=ProfileOut)
def read_profile(db: Session = Depends(get_db)) -> Profile:
    return get_profile(db)


@router.patch("", response_model=ProfileOut)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db)) -> Profile:
    profile = get_profile(db)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name is required")
        profile.name = name
    if "daily_goal" in data and data["daily_goal"] is not None:
        profile.daily_goal = data["daily_goal"]
    db.commit()
    db.refresh(profile)
    return profile
