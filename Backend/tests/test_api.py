from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Word

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(engine)


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)
PASSWORD = "senha12345"


def seed_orphan() -> None:
    db = TestingSession()
    now = datetime.now(timezone.utc)
    db.add(
        Word(
            id="w_legacy0001",
            user_id=None,
            term="legacy",
            term_key="legacy",
            translation="legado",
            definition="",
            example="",
            status="new",
            created_at=now,
            difficulty=3,
            review_count=0,
            success_count=0,
            next_review_at=now,
            interval_days=0,
        )
    )
    db.commit()
    db.close()


def sign_in(email: str, name: str = "Ana") -> dict[str, str]:
    created = client.post(
        "/api/auth/register",
        json={"email": email, "password": PASSWORD, "name": name},
    )
    if created.status_code == 409:
        created = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert created.status_code in (200, 201), created.text
    return {"Authorization": f"Bearer {created.json()['token']}"}


seed_orphan()
OWNER = sign_in("ana@example.com", "Ana")


def test_word_roundtrip_and_duplicate():
    created = client.post(
        "/api/words",
        headers=OWNER,
        json={"term": "apple", "translation": "maçã", "definition": "a fruit"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["term"] == "apple"
    assert body["status"] == "new"
    assert body["lastReviewedAt"] is None

    again = client.post("/api/words", headers=OWNER, json={"term": " Apple ", "translation": "outra"})
    assert again.status_code == 409
    assert again.json()["detail"]["word"]["id"] == body["id"]

    graded = client.post(f"/api/words/{body['id']}/grade", headers=OWNER, json={"grade": "good"})
    assert graded.status_code == 200
    assert graded.json()["intervalDays"] == 1
    assert graded.json()["status"] == "review"
    assert graded.json()["lastGrade"] == "good"


def test_deck_uses_existing_words_and_delete_keeps_the_word():
    word = client.post("/api/words", headers=OWNER, json={"term": "journey", "translation": "jornada"}).json()
    deck = client.post("/api/decks", headers=OWNER, json={"name": "Viagem", "wordIds": [word["id"]]})
    assert deck.status_code == 201
    assert deck.json()["wordIds"] == [word["id"]]

    added = client.post(
        "/api/words",
        headers=OWNER,
        params={"deckId": deck.json()["id"]},
        json={"term": "luggage", "translation": "bagagem"},
    )
    assert added.status_code == 201
    listed = client.get("/api/bootstrap", headers=OWNER).json()
    deck_ids = next(item["wordIds"] for item in listed["decks"] if item["id"] == deck.json()["id"])
    assert added.json()["id"] in deck_ids

    removed = client.delete(f"/api/decks/{deck.json()['id']}/words/{word['id']}", headers=OWNER)
    assert removed.status_code == 200
    assert removed.json()["wordIds"] == [added.json()["id"]]
    terms = {item["term"] for item in client.get("/api/words", headers=OWNER).json()}
    assert {"journey", "luggage"} <= terms


def test_bootstrap_includes_profile():
    payload = client.get("/api/bootstrap", headers=OWNER)
    assert payload.status_code == 200
    data = payload.json()
    assert data["profile"]["dailyGoal"] == 10
    assert data["profile"]["email"] == "ana@example.com"
    assert "words" in data and "decks" in data


def test_accounts_stay_separate():
    mine = client.get("/api/bootstrap", headers=OWNER).json()
    assert any(word["term"] == "legacy" for word in mine["words"])

    other = sign_in("bia@example.com", "Bia")
    empty = client.get("/api/bootstrap", headers=other)
    assert empty.status_code == 200
    assert empty.json()["words"] == []

    same = client.post("/api/words", headers=other, json={"term": "legacy", "translation": "outra"})
    assert same.status_code == 201

    hidden = client.post("/api/words/w_legacy0001/grade", headers=other, json={"grade": "good"})
    assert hidden.status_code == 404

    assert client.get("/api/bootstrap").status_code == 401
    bad = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "errada123"})
    assert bad.status_code == 401
    taken = client.post(
        "/api/auth/register",
        json={"email": "Ana@example.com", "password": PASSWORD, "name": "Outra"},
    )
    assert taken.status_code == 409
