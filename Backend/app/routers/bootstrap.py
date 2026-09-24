from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deck, Sentence, Song, Word
from app.routers.decks import to_out
from app.routers.profile import get_profile
from app.schemas import BootstrapOut

router = APIRouter(prefix="/api", tags=["bootstrap"])


@router.get("/bootstrap", response_model=BootstrapOut)
def bootstrap(db: Session = Depends(get_db)) -> BootstrapOut:
    words = list(db.scalars(select(Word).order_by(Word.created_at.desc())))
    sentences = list(db.scalars(select(Sentence).order_by(Sentence.created_at.desc())))
    songs = list(db.scalars(select(Song).order_by(Song.created_at.desc())))
    decks = [to_out(deck) for deck in db.scalars(select(Deck).order_by(Deck.created_at.desc()))]
    return BootstrapOut(words=words, sentences=sentences, songs=songs, decks=decks, profile=get_profile(db))
