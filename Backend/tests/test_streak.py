from datetime import date

from app.models import User
from app.streak import record_study, visible_streak
from tests.test_api import PASSWORD, client


def test_visible_streak_survives_today_and_yesterday_only():
    assert visible_streak(4, date(2026, 11, 4), date(2026, 11, 4)) == 4
    assert visible_streak(4, date(2026, 11, 4), date(2026, 11, 5)) == 4
    assert visible_streak(4, date(2026, 11, 4), date(2026, 11, 6)) == 0
    assert visible_streak(0, None, date(2026, 11, 3)) == 0


def test_record_study_counts_once_per_day_and_restarts_after_a_gap():
    user = User(
        id="u",
        email="a@b.co",
        password_hash="x",
        name="Ana",
        daily_goal=10,
        streak_days=0,
        created_at=date(2026, 11, 1),
    )
    record_study(user, date(2026, 11, 3))
    record_study(user, date(2026, 11, 3))
    assert user.streak_days == 1
    record_study(user, date(2026, 11, 4))
    assert user.streak_days == 2
    record_study(user, date(2026, 11, 6))
    assert user.streak_days == 1
    assert user.last_study_on == date(2026, 11, 6)


def test_streak_follows_the_local_day_sent_by_the_app():
    created = client.post(
        "/api/auth/register",
        json={"email": "streak@example.com", "password": PASSWORD, "name": "Lia"},
    )
    assert created.status_code == 201
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    day3 = {**headers, "X-Local-Date": "2026-11-03"}
    day4 = {**headers, "X-Local-Date": "2026-11-04"}
    day6 = {**headers, "X-Local-Date": "2026-11-06"}
    day7 = {**headers, "X-Local-Date": "2026-11-07"}

    word = client.post("/api/words", headers=day3, json={"term": "streak", "translation": "sequência"})
    assert word.status_code == 201
    word_id = word.json()["id"]
    again = client.post("/api/words", headers=day3, json={"term": "again", "translation": "de novo"})
    assert again.status_code == 201
    assert client.get("/api/profile", headers=day3).json()["streakDays"] == 1

    graded = client.post(f"/api/words/{word_id}/grade", headers=day4, json={"grade": "good"})
    assert graded.status_code == 200
    assert client.get("/api/profile", headers=day4).json()["streakDays"] == 2
    assert client.get("/api/bootstrap", headers=day6).json()["profile"]["streakDays"] == 0

    song = client.post(
        "/api/songs",
        headers=day6,
        json={"title": "Song", "artist": "Band", "lyrics": "line", "myTranslation": "", "referenceTranslation": ""},
    )
    assert song.status_code == 201
    song_id = song.json()["id"]
    lyrics = client.patch(f"/api/songs/{song_id}", headers=day6, json={"lyrics": "line\n\nnext"})
    assert lyrics.status_code == 200
    assert client.get("/api/profile", headers=day6).json()["streakDays"] == 0

    translated = client.patch(f"/api/songs/{song_id}", headers=day6, json={"myTranslation": "linha"})
    assert translated.status_code == 200
    same_day = client.patch(f"/api/songs/{song_id}", headers=day6, json={"myTranslation": "linha dois"})
    assert same_day.status_code == 200
    assert client.get("/api/profile", headers=day6).json()["streakDays"] == 1
    assert client.get("/api/profile", headers=day7).json()["streakDays"] == 1
