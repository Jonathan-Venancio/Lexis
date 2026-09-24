from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sentence, User
from app.routers.words import blank_to_none, new_id
from app.schemas import SentenceOut, SentenceUpdate, SentenceWrite
from app.security import get_current_user

router = APIRouter(prefix="/api/sentences", tags=["sentences"])


def get_sentence_or_404(db: Session, sentence_id: str, user_id: str) -> Sentence:
    sentence = db.get(Sentence, sentence_id)
    if sentence is None or sentence.user_id != user_id:
        raise HTTPException(status_code=404, detail="Sentence not found")
    return sentence


@router.get("", response_model=list[SentenceOut])
def list_sentences(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Sentence]:
    return list(db.scalars(select(Sentence).where(Sentence.user_id == user.id).order_by(Sentence.created_at.desc())))


@router.post("", response_model=SentenceOut, status_code=201)
def create_sentence(
    payload: SentenceWrite,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Sentence:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text is required")
    sentence = Sentence(
        id=new_id("s"),
        user_id=user.id,
        text=text,
        translation=blank_to_none(payload.translation),
        notes=blank_to_none(payload.notes),
        created_at=datetime.now(timezone.utc),
    )
    db.add(sentence)
    db.commit()
    db.refresh(sentence)
    return sentence


@router.patch("/{sentence_id}", response_model=SentenceOut)
def update_sentence(
    sentence_id: str,
    payload: SentenceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Sentence:
    sentence = get_sentence_or_404(db, sentence_id, user.id)
    data = payload.model_dump(exclude_unset=True)
    if "text" in data:
        text = (data["text"] or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Text is required")
        sentence.text = text
    if "translation" in data:
        sentence.translation = blank_to_none(data["translation"])
    if "notes" in data:
        sentence.notes = blank_to_none(data["notes"])
    db.commit()
    db.refresh(sentence)
    return sentence


@router.delete("/{sentence_id}", status_code=204)
def delete_sentence(
    sentence_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    sentence = get_sentence_or_404(db, sentence_id, user.id)
    db.delete(sentence)
    db.commit()
