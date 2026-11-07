from datetime import datetime, timezone

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid
from py_vapid.utils import b64urldecode, b64urlencode
from sqlalchemy import select

from app.config import get_settings
from app.models import PushSubscription, User
from app.push import generate_vapid_keys
from app.reminders import run_reminders
from tests.test_api import PASSWORD, TestingSession, client, sign_in
from tests.test_reminders import local, prepare

KEYS = {
    "endpoint": "https://push.example/sub/1",
    "p256dh": "p256dh-key-value-ok",
    "auth": "auth-key-value",
}


def test_generated_vapid_keys_roundtrip():
    public, private = generate_vapid_keys()
    raw = b64urldecode(public.encode())
    assert len(raw) == 65
    assert raw[0] == 4
    loaded = Vapid.from_string(private)
    again = b64urlencode(
        loaded.public_key.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
    )
    assert again == public


def test_profile_hides_the_push_key_until_the_server_has_one():
    headers = sign_in("push-ready@example.com")
    settings = get_settings()
    previous = (settings.vapid_public_key, settings.vapid_private_key)
    settings.vapid_public_key = ""
    settings.vapid_private_key = ""
    try:
        hidden = client.get("/api/profile", headers=headers)
        assert hidden.status_code == 200
        assert hidden.json()["pushReady"] is False
        assert hidden.json()["pushPublicKey"] == ""
        settings.vapid_public_key = "public-key"
        settings.vapid_private_key = "private-key"
        shown = client.get("/api/profile", headers=headers)
        assert shown.json()["pushReady"] is True
        assert shown.json()["pushPublicKey"] == "public-key"
    finally:
        settings.vapid_public_key, settings.vapid_private_key = previous


def test_push_subscription_belongs_to_the_account_that_saved_it():
    first = sign_in("push-owner@example.com")
    saved = client.post("/api/profile/push", headers=first, json=KEYS)
    assert saved.status_code == 204, saved.text
    updated = client.post("/api/profile/push", headers=first, json={**KEYS, "auth": "auth-key-value2"})
    assert updated.status_code == 204, updated.text

    db = TestingSession()
    rows = list(db.scalars(select(PushSubscription).where(PushSubscription.endpoint == KEYS["endpoint"])))
    assert len(rows) == 1
    assert rows[0].auth == "auth-key-value2"
    owner = rows[0].user_id

    second = client.post(
        "/api/auth/register",
        json={"email": "push-other@example.com", "password": PASSWORD, "name": "Lia"},
    )
    assert second.status_code == 201, second.text
    moved = client.post(
        "/api/profile/push",
        headers={"Authorization": f"Bearer {second.json()['token']}"},
        json=KEYS,
    )
    assert moved.status_code == 204, moved.text
    db.expire_all()
    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == KEYS["endpoint"]))
    assert row is not None
    assert row.user_id != owner

    rejected = client.post("/api/profile/push", headers=first, json={**KEYS, "endpoint": "http://push.example/no"})
    assert rejected.status_code == 422

    removed = client.request(
        "DELETE",
        "/api/profile/push",
        headers={"Authorization": f"Bearer {second.json()['token']}"},
        json={"endpoint": KEYS["endpoint"]},
    )
    assert removed.status_code == 204, removed.text
    db.expire_all()
    assert db.scalar(select(PushSubscription).where(PushSubscription.endpoint == KEYS["endpoint"])) is None
    db.close()


def test_push_follows_the_reminder_clock_without_an_email():
    user_id = prepare("remind-push@example.com", studied=datetime(2026, 11, 3).date())
    db = TestingSession()
    user = db.get(User, user_id)
    assert user is not None
    user.email_reminders = False
    db.add(
        PushSubscription(
            id="ps_clock000001",
            user_id=user_id,
            endpoint="https://push.example/clock",
            p256dh="p" * 20,
            auth="a" * 16,
            created_at=datetime(2026, 11, 4, tzinfo=timezone.utc),
        )
    )
    db.commit()
    emails: list[str] = []
    pushes: list[str] = []

    def capture(_subs, title, body, url):
        assert title == "Lexis"
        assert url.startswith("https://")
        pushes.append(body)
        return 1, []

    assert run_reminders(db, now=local(2026, 11, 4, 18, 50), send=lambda *_args: emails.append("x"), push=capture) == 0
    assert run_reminders(db, now=local(2026, 11, 4, 19, 10), send=lambda *_args: emails.append("x"), push=capture) == 1
    assert emails == []
    assert "4 dias" in pushes[0]
    assert run_reminders(db, now=local(2026, 11, 4, 20, 0), send=lambda *_args: emails.append("x"), push=capture) == 0
    db.close()


def test_email_and_push_share_one_slot():
    user_id = prepare("remind-both@example.com", studied=datetime(2026, 11, 3).date())
    db = TestingSession()
    db.add(
        PushSubscription(
            id="ps_both0000001",
            user_id=user_id,
            endpoint="https://push.example/both",
            p256dh="p" * 20,
            auth="a" * 16,
            created_at=datetime(2026, 11, 4, tzinfo=timezone.utc),
        )
    )
    db.commit()
    emails: list[str] = []
    pushes: list[str] = []
    assert (
        run_reminders(
            db,
            now=local(2026, 11, 4, 19, 10),
            send=lambda *_args: emails.append("mail"),
            push=lambda *_args: pushes.append("push") or (1, []),
        )
        == 1
    )
    assert emails == ["mail"]
    assert pushes == ["push"]
    assert (
        run_reminders(
            db,
            now=local(2026, 11, 4, 19, 20),
            send=lambda *_args: emails.append("mail"),
            push=lambda *_args: pushes.append("push") or (1, []),
        )
        == 0
    )
    db.close()


def test_an_expired_push_subscription_is_dropped_and_the_slot_stays_open():
    user_id = prepare("remind-gone@example.com", studied=datetime(2026, 11, 3).date())
    db = TestingSession()
    user = db.get(User, user_id)
    assert user is not None
    user.email_reminders = False
    db.add(
        PushSubscription(
            id="ps_gone0000001",
            user_id=user_id,
            endpoint="https://push.example/gone",
            p256dh="p" * 20,
            auth="a" * 16,
            created_at=datetime(2026, 11, 4, tzinfo=timezone.utc),
        )
    )
    db.commit()
    assert run_reminders(db, now=local(2026, 11, 4, 19, 10), send=lambda *_args: None, push=lambda subs, *_args: (0, [subs[0].id])) == 0
    assert db.get(PushSubscription, "ps_gone0000001") is None
    refreshed = db.get(User, user_id)
    assert refreshed is not None
    assert refreshed.reminder_sent_on is None
    db.close()
