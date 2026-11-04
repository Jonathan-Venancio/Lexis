from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deck, Sentence, Song, User, Word
from app.routers.decks import to_out
from app.routers.profile import remember_client, to_profile
from app.schemas import BootstrapOut
from app.security import get_current_user
from app.streak import local_today

router = APIRouter(prefix="/api", tags=["bootstrap"])


@router.get("/bootstrap", response_model=BootstrapOut)
def bootstrap(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    today: date = Depends(local_today),
    x_timezone: Annotated[str | None, Header()] = None,
    x_locale: Annotated[str | None, Header()] = None,
) -> BootstrapOut:
    remember_client(user, db, x_timezone, x_locale)
    words = list(db.scalars(select(Word).where(Word.user_id == user.id).order_by(Word.created_at.desc())))
    sentences = list(db.scalars(select(Sentence).where(Sentence.user_id == user.id).order_by(Sentence.created_at.desc())))
    songs = list(db.scalars(select(Song).where(Song.user_id == user.id).order_by(Song.created_at.desc())))
    decks = [
        to_out(deck)
        for deck in db.scalars(select(Deck).where(Deck.user_id == user.id).order_by(Deck.created_at.desc()))
    ]
    return BootstrapOut(words=words, sentences=sentences, songs=songs, decks=decks, profile=to_profile(user, today))
