from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

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


def test_word_roundtrip_and_duplicate():
    created = client.post("/api/words", json={"term": "apple", "translation": "maçã", "definition": "a fruit"})
    assert created.status_code == 201
    body = created.json()
    assert body["term"] == "apple"
    assert body["status"] == "new"
    assert body["lastReviewedAt"] is None

    again = client.post("/api/words", json={"term": " Apple ", "translation": "outra"})
    assert again.status_code == 409
    assert again.json()["detail"]["word"]["id"] == body["id"]

    graded = client.post(f"/api/words/{body['id']}/grade", json={"grade": "good"})
    assert graded.status_code == 200
    assert graded.json()["intervalDays"] == 1
    assert graded.json()["status"] == "review"
    assert graded.json()["lastGrade"] == "good"


def test_deck_uses_existing_words_and_delete_keeps_the_word():
    word = client.post("/api/words", json={"term": "journey", "translation": "jornada"}).json()
    deck = client.post("/api/decks", json={"name": "Viagem", "wordIds": [word["id"]]})
    assert deck.status_code == 201
    assert deck.json()["wordIds"] == [word["id"]]

    added = client.post(
        "/api/words",
        params={"deckId": deck.json()["id"]},
        json={"term": "luggage", "translation": "bagagem"},
    )
    assert added.status_code == 201
    assert added.json()["id"] in client.get(f"/api/bootstrap").json()["decks"][0]["wordIds"]

    removed = client.delete(f"/api/decks/{deck.json()['id']}/words/{word['id']}")
    assert removed.status_code == 200
    assert removed.json()["wordIds"] == [added.json()["id"]]
    terms = {item["term"] for item in client.get("/api/words").json()}
    assert {"journey", "luggage"} <= terms


def test_bootstrap_includes_profile():
    payload = client.get("/api/bootstrap")
    assert payload.status_code == 200
    data = payload.json()
    assert data["profile"]["dailyGoal"] == 10
    assert "words" in data and "decks" in data
