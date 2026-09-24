from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deck, DeckWord, Word
from app.schemas import GradeIn, WordCreate, WordOut, WordUpdate
from app.srs import apply_grade

router = APIRouter(prefix="/api/words", tags=["words"])


def normalize_term(term: str) -> str:
    return " ".join(term.strip().lower().split())


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def duplicate(existing: Word) -> HTTPException:
    payload = WordOut.model_validate(existing).model_dump(by_alias=True, mode="json")
    return HTTPException(status_code=409, detail={"code": "duplicate", "word": payload})


def get_word_or_404(db: Session, word_id: str) -> Word:
    word = db.get(Word, word_id)
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    return word


@router.get("", response_model=list[WordOut])
def list_words(db: Session = Depends(get_db)) -> list[Word]:
    return list(db.scalars(select(Word).order_by(Word.created_at.desc())))


@router.post("", response_model=WordOut, status_code=201)
def create_word(
    payload: WordCreate,
    deck_id: str | None = Query(default=None, alias="deckId"),
    db: Session = Depends(get_db),
) -> Word:
    term = payload.term.strip()
    translation = payload.translation.strip()
    key = normalize_term(term)
    if not key or not translation:
        raise HTTPException(status_code=422, detail="Term and translation are required")
    existing = db.scalar(select(Word).where(Word.term_key == key))
    if existing is not None:
        raise duplicate(existing)

    deck = None
    if deck_id:
        deck = db.get(Deck, deck_id)
        if deck is None:
            raise HTTPException(status_code=404, detail="Deck not found")

    now = datetime.now(timezone.utc)
    word = Word(
        id=new_id("w"),
        term=term,
        term_key=key,
        translation=translation,
        definition=payload.definition.strip(),
        example=payload.example.strip(),
        notes=blank_to_none(payload.notes),
        part_of_speech=blank_to_none(payload.part_of_speech),
        status="new",
        created_at=now,
        difficulty=3,
        review_count=0,
        success_count=0,
        last_reviewed_at=None,
        next_review_at=now,
        interval_days=0,
    )
    db.add(word)
    if deck is not None:
        last = db.scalar(select(func.max(DeckWord.position)).where(DeckWord.deck_id == deck.id))
        db.add(DeckWord(deck_id=deck.id, word_id=word.id, position=(last or 0) + 1))
    db.commit()
    db.refresh(word)
    return word


@router.patch("/{word_id}", response_model=WordOut)
def update_word(word_id: str, payload: WordUpdate, db: Session = Depends(get_db)) -> Word:
    word = get_word_or_404(db, word_id)
    data = payload.model_dump(exclude_unset=True)
    if "term" in data:
        term = (data["term"] or "").strip()
        key = normalize_term(term)
        if not key:
            raise HTTPException(status_code=422, detail="Term is required")
        existing = db.scalar(select(Word).where(Word.term_key == key, Word.id != word.id))
        if existing is not None:
            raise duplicate(existing)
        word.term = term
        word.term_key = key
    if "translation" in data:
        translation = (data["translation"] or "").strip()
        if not translation:
            raise HTTPException(status_code=422, detail="Translation is required")
        word.translation = translation
    if "definition" in data:
        word.definition = (data["definition"] or "").strip()
    if "example" in data:
        word.example = (data["example"] or "").strip()
    if "notes" in data:
        word.notes = blank_to_none(data["notes"])
    if "part_of_speech" in data:
        word.part_of_speech = blank_to_none(data["part_of_speech"])
    db.commit()
    db.refresh(word)
    return word


@router.delete("/{word_id}", status_code=204)
def delete_word(word_id: str, db: Session = Depends(get_db)) -> None:
    word = get_word_or_404(db, word_id)
    db.delete(word)
    db.commit()


@router.post("/{word_id}/grade", response_model=WordOut)
def grade_word(word_id: str, payload: GradeIn, db: Session = Depends(get_db)) -> Word:
    word = get_word_or_404(db, word_id)
    apply_grade(word, payload.grade)
    db.commit()
    db.refresh(word)
    return word
