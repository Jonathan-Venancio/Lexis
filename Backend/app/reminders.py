import logging
import os
import threading
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.mail import send_email
from app.models import User
from app.streak import visible_streak

logger = logging.getLogger("lexis.reminders")

FREE = (
    (
        "{name}, {days} seguidos. O vocabulário sentiu sua falta hoje.",
        "{name}, {days} in a row. Your vocabulary missed you today.",
    ),
    (
        "A sequência de {days} pediu notícias suas, {name}.",
        "Your {days} streak asked about you, {name}.",
    ),
    (
        "{name}, {days} no bolso. Falta o de hoje para não esfriar.",
        "{name}, {days} in the bag. Today is the one that keeps it warm.",
    ),
    (
        "Passando para avisar, {name}: {days} de sequência estão te esperando.",
        "Just passing by, {name}: {days} of streak are waiting.",
    ),
)
LATE = (
    (
        "{name}, o dia está no fim e {days} vão embora se você não aparecer.",
        "{name}, the day is ending and {days} leave with it if you don't show up.",
    ),
    (
        "Última chamada, {name}. {days} de sequência estão na beirada.",
        "Last call, {name}. {days} of streak are on the edge.",
    ),
    (
        "{name}, daqui a pouco vira o dia. {days} pedem só mais um estudo.",
        "{name}, the day is about to turn. {days} only need one more study.",
    ),
    (
        "Não deixa {days} dormirem de castigo, {name}. Ainda dá tempo.",
        "Don't send {days} to bed grounded, {name}. There's still time.",
    ),
)
RESTART = (
    (
        "{name}, a sequência está em zero. Uma palavra já acende de novo.",
        "{name}, the streak is at zero. One word lights it up again.",
    ),
    (
        "Sem culpa, {name}. Hoje é um bom dia para o dia 1.",
        "No guilt, {name}. Today is a good day to be day 1.",
    ),
    (
        "{name}, o contador zerou. O Lexis deixou a cadeira quente.",
        "{name}, the counter reset. Lexis kept your chair warm.",
    ),
)
RESTART_LATE = (
    (
        "{name}, o dia vai virar com a sequência ainda em zero.",
        "{name}, the day is about to turn and the streak is still at zero.",
    ),
    (
        "Ainda cabe um estudo hoje, {name}. Amanhã você já não começa do nada.",
        "A study still fits today, {name}. Tomorrow you won't start from nothing.",
    ),
    (
        "{name}, última chance do dia para abrir uma sequência nova.",
        "{name}, last chance today to open a new streak.",
    ),
)


def days_label(count: int, locale: str) -> str:
    if locale == "en":
        return "1 day" if count == 1 else f"{count} days"
    return "1 dia" if count == 1 else f"{count} dias"


def reminder_copy(user: User, slot: str, today: date, streak: int) -> tuple[str, str]:
    locale = "en" if user.locale == "en" else "pt"
    index = 0 if locale == "pt" else 1
    if streak <= 0 and slot == "late":
        pool = RESTART_LATE
    elif streak <= 0:
        pool = RESTART
    elif slot == "late":
        pool = LATE
    else:
        pool = FREE
    pick = pool[(today.toordinal() + (1 if slot == "late" else 0) + len(user.name)) % len(pool)]
    label = days_label(streak, locale)
    name = user.name.strip() or ("você" if locale == "pt" else "there")
    hook = pick[index].replace("{name}", name).replace("{days}", label)
    url = get_settings().app_url.rstrip("/")
    return hook, f"{hook}\n\n{url}\n"


def reminder_zone(user: User) -> ZoneInfo:
    configured = get_settings().default_timezone.strip()
    name = configured or user.timezone or "UTC"
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def local_now(user: User, now: datetime) -> datetime:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return now.astimezone(reminder_zone(user))


def send_test_reminder(user: User, *, now: datetime | None = None, send=None) -> None:
    moment = now or datetime.now(timezone.utc)
    local = local_now(user, moment)
    streak = visible_streak(user.streak_days, user.last_study_on, local.date())
    subject, body = reminder_copy(user, "free", local.date(), streak)
    (send or send_email)(user.email, subject, body)


def clock_reached(now: datetime, clock: str) -> bool:
    hour, minute = (int(part) for part in clock.split(":", 1))
    return now.hour * 60 + now.minute >= hour * 60 + minute


def run_reminders(db: Session, *, now: datetime | None = None, send=send_email) -> int:
    moment = now or datetime.now(timezone.utc)
    sent = 0
    users = list(db.scalars(select(User).where(User.email_reminders.is_(True))))
    for user in users:
        if deliver_reminder(db, user, moment, send):
            sent += 1
    return sent


def deliver_reminder(db: Session, user: User, now: datetime, send) -> bool:
    local = local_now(user, now)
    today = local.date()
    if user.last_study_on == today:
        return False
    first_due = clock_reached(local, user.reminder_time) and user.reminder_sent_on != today
    late_clock = user.reminder_late_time
    late_due = bool(late_clock) and clock_reached(local, late_clock) and user.reminder_late_sent_on != today
    if not first_due and not late_due:
        return False
    slot = "late" if late_due else "free"
    streak = visible_streak(user.streak_days, user.last_study_on, today)
    subject, body = reminder_copy(user, slot, today, streak)
    try:
        send(user.email, subject, body)
    except Exception:
        logger.exception("reminder email failed for %s", user.id)
        db.rollback()
        return False
    if first_due:
        user.reminder_sent_on = today
    if late_due:
        user.reminder_late_sent_on = today
    db.commit()
    return True


def should_loop() -> bool:
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    if os.environ.get("REMINDERS_LOOP", "1") == "0":
        return False
    return get_settings().smtp_configured


def reminder_loop(stop: threading.Event) -> None:
    stop.wait(20)
    while not stop.is_set():
        try:
            with SessionLocal() as db:
                count = run_reminders(db)
            if count:
                logger.info("sent %s reminder email(s)", count)
        except Exception:
            logger.exception("reminder loop failed")
        stop.wait(300)


def main() -> int:
    if not get_settings().smtp_configured:
        print("SMTP is not configured")
        return 1
    with SessionLocal() as db:
        count = run_reminders(db)
    print(f"sent {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
