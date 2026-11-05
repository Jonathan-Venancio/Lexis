from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.config import get_settings
from app.models import User
from app.reminders import local_now, run_reminders
from tests.test_api import PASSWORD, TestingSession, client

SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def local(year: int, month: int, day: int, hour: int, minute: int) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=SAO_PAULO).astimezone(timezone.utc)


def silence_others(email: str) -> None:
    db = TestingSession()
    for user in db.scalars(select(User)):
        if user.email != email:
            user.email_reminders = False
    db.commit()
    db.close()


def prepare(email: str, *, studied=None, streak: int = 4, late: str | None = "23:30") -> str:
    created = client.post(
        "/api/auth/register",
        json={"email": email, "password": PASSWORD, "name": "Lia"},
    )
    assert created.status_code == 201, created.text
    db = TestingSession()
    user = db.scalar(select(User).where(User.email == email))
    assert user is not None
    user.timezone = "America/Sao_Paulo"
    user.locale = "pt"
    user.email_reminders = True
    user.reminder_time = "19:00"
    user.reminder_late_time = late
    user.streak_days = streak
    user.last_study_on = studied
    db.commit()
    user_id = user.id
    db.close()
    silence_others(email)
    return user_id


def test_first_reminder_waits_for_its_hour_and_the_second_waits_for_no_study():
    user_id = prepare("remind-first@example.com", studied=datetime(2026, 11, 3).date())
    sent: list[tuple[str, str]] = []

    def capture(to: str, subject: str, body: str) -> None:
        sent.append((to, subject))

    db = TestingSession()
    assert run_reminders(db, now=local(2026, 11, 4, 18, 50), send=capture) == 0
    assert sent == []
    assert run_reminders(db, now=local(2026, 11, 4, 19, 10), send=capture) == 1
    assert "4 dias" in sent[0][1]
    assert run_reminders(db, now=local(2026, 11, 4, 20, 0), send=capture) == 0

    user = db.get(User, user_id)
    assert user is not None
    user.last_study_on = datetime(2026, 11, 4).date()
    db.commit()
    assert run_reminders(db, now=local(2026, 11, 4, 23, 40), send=capture) == 0
    assert len(sent) == 1
    db.close()


def test_second_reminder_sends_when_the_day_is_still_empty():
    prepare("remind-late@example.com", studied=datetime(2026, 11, 3).date())
    sent: list[str] = []
    db = TestingSession()
    assert run_reminders(db, now=local(2026, 11, 4, 19, 5), send=lambda *_args: sent.append("free")) == 1
    assert run_reminders(db, now=local(2026, 11, 4, 23, 40), send=lambda *_args: sent.append("late")) == 1
    assert sent == ["free", "late"]
    db.close()


def test_a_missed_window_sends_only_the_later_message():
    prepare("remind-catchup@example.com", studied=None, streak=2)
    sent: list[str] = []
    db = TestingSession()
    assert run_reminders(db, now=local(2026, 11, 6, 23, 45), send=lambda _to, subject, _body: sent.append(subject)) == 1
    assert len(sent) == 1
    user = db.scalar(select(User).where(User.email == "remind-catchup@example.com"))
    assert user is not None
    assert user.reminder_sent_on is not None
    assert user.reminder_late_sent_on is not None
    db.close()


def test_default_timezone_overrides_the_account_clock():
    settings = get_settings()
    previous = settings.default_timezone
    settings.default_timezone = "Europe/Lisbon"
    try:
        user = User(
            id="u",
            email="a@b.co",
            password_hash="x",
            name="Lia",
            daily_goal=10,
            streak_days=0,
            timezone="America/Sao_Paulo",
            created_at=datetime(2026, 11, 5, tzinfo=timezone.utc),
        )
        local = local_now(user, datetime(2026, 11, 5, 11, 20, tzinfo=timezone.utc))
        assert local.hour == 11
        assert local.minute == 20
    finally:
        settings.default_timezone = previous


def test_profile_stores_both_times_and_rejects_a_late_hour_that_comes_first():
    headers = client.post(
        "/api/auth/register",
        json={"email": "remind-profile@example.com", "password": PASSWORD, "name": "Lia"},
    )
    token = {"Authorization": f"Bearer {headers.json()['token']}", "X-Timezone": "America/Sao_Paulo", "X-Locale": "pt"}
    saved = client.patch(
        "/api/profile",
        headers=token,
        json={"emailReminders": True, "reminderTime": "18:30", "reminderLateTime": "23:10"},
    )
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["emailReminders"] is True
    assert body["reminderTime"] == "18:30"
    assert body["reminderLateTime"] == "23:10"

    rejected = client.patch(
        "/api/profile",
        headers=token,
        json={"reminderTime": "23:00", "reminderLateTime": "18:00"},
    )
    assert rejected.status_code == 422
