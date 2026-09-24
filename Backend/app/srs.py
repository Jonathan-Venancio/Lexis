"""Spaced repetition. Kept in step with Frontend/src/lib/srs.ts."""

from datetime import datetime, timedelta, timezone

INTERVAL_LADDER = [1, 3, 7, 14, 30, 60]
MINUTE = 60
DAY = 24 * 60 * MINUTE


def ladder_index(interval_days: int) -> int:
    idx = -1
    for i, step in enumerate(INTERVAL_LADDER):
        if interval_days >= step:
            idx = i
    return idx


def ladder_at(idx: int) -> int:
    bounded = min(max(idx, 0), len(INTERVAL_LADDER) - 1)
    return INTERVAL_LADDER[bounded]


def status_for(days: int) -> str:
    if days >= 30:
        return "mastered"
    if days >= 1:
        return "review"
    return "learning"


def apply_grade(word, grade: str, now: datetime | None = None):
    moment = now or datetime.now(timezone.utc)
    idx = ladder_index(word.interval_days)

    if grade == "again":
        interval_days, delay, status = 0, 1 * MINUTE, "learning"
    elif grade == "hard":
        if idx < 0:
            interval_days, delay, status = 0, 6 * MINUTE, "learning"
        else:
            interval_days = ladder_at(idx)
            delay, status = interval_days * DAY, status_for(interval_days)
    elif grade == "good":
        interval_days = ladder_at(idx + 1)
        delay, status = interval_days * DAY, status_for(interval_days)
    else:
        if idx < 0:
            interval_days, delay, status = 4, 4 * DAY, "review"
        else:
            interval_days = ladder_at(idx + 2)
            delay, status = interval_days * DAY, status_for(interval_days)

    delta = {"again": 1, "hard": 0.5, "easy": -1}.get(grade, -0.5)
    word.difficulty = min(5, max(1, word.difficulty + delta))
    word.review_count += 1
    if grade in ("good", "easy"):
        word.success_count += 1
    word.last_reviewed_at = moment
    word.next_review_at = moment + timedelta(seconds=delay)
    word.interval_days = interval_days
    word.status = status
    word.last_grade = grade
    return word
