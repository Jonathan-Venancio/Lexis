from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import Header

from app.models import User


def parse_local_date(value: str | None) -> date:
    if value:
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            pass
    return datetime.now(timezone.utc).date()


def local_today(x_local_date: Annotated[str | None, Header()] = None) -> date:
    return parse_local_date(x_local_date)


def visible_streak(streak_days: int, last_study_on: date | None, today: date) -> int:
    if last_study_on is None or streak_days <= 0:
        return 0
    gap = (today - last_study_on).days
    if gap <= 1:
        return streak_days
    return 0


def record_study(user: User, today: date) -> None:
    last = user.last_study_on
    if last == today or (last is not None and today < last):
        return
    if last is not None and today - last == timedelta(days=1):
        user.streak_days += 1
    else:
        user.streak_days = 1
    user.last_study_on = today
