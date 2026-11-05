import re
from datetime import date
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.schemas import ProfileOut, ProfileUpdate
from app.security import get_current_user
from app.streak import local_today, visible_streak

CLOCK = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

router = APIRouter(prefix="/api/profile", tags=["profile"])


def to_profile(user: User, today: date) -> ProfileOut:
    return ProfileOut(
        name=user.name,
        email=user.email,
        daily_goal=user.daily_goal,
        streak_days=visible_streak(user.streak_days, user.last_study_on, today),
        email_reminders=user.email_reminders,
        reminder_time=user.reminder_time,
        reminder_late_time=user.reminder_late_time,
        reminders_ready=get_settings().smtp_configured,
    )


def remember_client(user: User, db: Session, timezone_name: str | None, locale: str | None) -> None:
    changed = False
    if timezone_name:
        try:
            ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError:
            timezone_name = None
        if timezone_name and user.timezone != timezone_name:
            user.timezone = timezone_name
            changed = True
    if locale in {"pt", "en"} and user.locale != locale:
        user.locale = locale
        changed = True
    if changed:
        db.commit()


def parse_clock(value: str) -> str:
    if not CLOCK.match(value):
        raise HTTPException(status_code=422, detail="Invalid reminder time")
    return value


@router.get("", response_model=ProfileOut)
def read_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(local_today),
    x_timezone: Annotated[str | None, Header()] = None,
    x_locale: Annotated[str | None, Header()] = None,
) -> ProfileOut:
    remember_client(user, db, x_timezone, x_locale)
    return to_profile(user, today)


@router.patch("", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(local_today),
    x_timezone: Annotated[str | None, Header()] = None,
    x_locale: Annotated[str | None, Header()] = None,
) -> ProfileOut:
    data = payload.model_dump(exclude_unset=True)
    remember_client(user, db, x_timezone, x_locale)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name is required")
        user.name = name
    if "daily_goal" in data and data["daily_goal"] is not None:
        user.daily_goal = data["daily_goal"]
    if "email_reminders" in data and data["email_reminders"] is not None:
        user.email_reminders = data["email_reminders"]
    if data.get("reminder_time"):
        user.reminder_time = parse_clock(data["reminder_time"])
    if "reminder_late_time" in data:
        late = data["reminder_late_time"]
        user.reminder_late_time = None if not late else parse_clock(late)
    if user.reminder_late_time and user.reminder_late_time <= user.reminder_time:
        raise HTTPException(status_code=422, detail="The second reminder must be later than the first")
    db.commit()
    db.refresh(user)
    return to_profile(user, today)
