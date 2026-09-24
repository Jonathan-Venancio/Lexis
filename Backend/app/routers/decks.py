from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deck, DeckWord, Word
from app.routers.words import new_id
from app.schemas import DeckCreate, DeckOut, DeckWordsIn

router = APIRouter(prefix="/api/decks", tags=["decks"])


def to_out(deck: Deck) -> DeckOut:
    return DeckOut(
        id=deck.id,
        name=deck.name,
        word_ids=[link.word_id for link in deck.words],
        created_at=deck.created_at,
    )


def get_deck_or_404(db: Session, deck_id: str) -> Deck:
    deck = db.get(Deck, deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.get("", response_model=list[DeckOut])
def list_decks(db: Session = Depends(get_db)) -> list[DeckOut]:
    decks = list(db.scalars(select(Deck).order_by(Deck.created_at.desc())))
    return [to_out(deck) for deck in decks]


@router.post("", response_model=DeckOut, status_code=201)
def create_deck(payload: DeckCreate, db: Session = Depends(get_db)) -> DeckOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    word_ids = list(dict.fromkeys(payload.word_ids))
    if word_ids:
        found = set(db.scalars(select(Word.id).where(Word.id.in_(word_ids))))
        missing = [word_id for word_id in word_ids if word_id not in found]
        if missing:
            raise HTTPException(status_code=422, detail="Unknown word ids")
    deck = Deck(id=new_id("deck"), name=name, created_at=datetime.now(timezone.utc))
    db.add(deck)
    for position, word_id in enumerate(word_ids, start=1):
        db.add(DeckWord(deck_id=deck.id, word_id=word_id, position=position))
    db.commit()
    db.expire(deck)
    return to_out(deck)


@router.delete("/{deck_id}", status_code=204)
def delete_deck(deck_id: str, db: Session = Depends(get_db)) -> None:
    deck = get_deck_or_404(db, deck_id)
    db.delete(deck)
    db.commit()


@router.post("/{deck_id}/words", response_model=DeckOut)
def add_words(deck_id: str, payload: DeckWordsIn, db: Session = Depends(get_db)) -> DeckOut:
    deck = get_deck_or_404(db, deck_id)
    incoming = list(dict.fromkeys(payload.word_ids))
    found = set(db.scalars(select(Word.id).where(Word.id.in_(incoming)))) if incoming else set()
    if any(word_id not in found for word_id in incoming):
        raise HTTPException(status_code=422, detail="Unknown word ids")
    already = {link.word_id for link in deck.words}
    last = db.scalar(select(func.max(DeckWord.position)).where(DeckWord.deck_id == deck.id)) or 0
    for word_id in incoming:
        if word_id in already:
            continue
        last += 1
        db.add(DeckWord(deck_id=deck.id, word_id=word_id, position=last))
    db.commit()
    db.expire(deck)
    return to_out(deck)


@router.delete("/{deck_id}/words/{word_id}", response_model=DeckOut)
def remove_word(deck_id: str, word_id: str, db: Session = Depends(get_db)) -> DeckOut:
    deck = get_deck_or_404(db, deck_id)
    link = db.get(DeckWord, (deck_id, word_id))
    if link is not None:
        db.delete(link)
        db.commit()
        db.expire(deck)
    return to_out(deck)
