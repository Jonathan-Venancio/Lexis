from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Song, User
from app.routers.words import blank_to_none, new_id
from app.schemas import SongOut, SongUpdate, SongWrite
from app.security import get_current_user

router = APIRouter(prefix="/api/songs", tags=["songs"])


def get_song_or_404(db: Session, song_id: str, user_id: str) -> Song:
    song = db.get(Song, song_id)
    if song is None or song.user_id != user_id:
        raise HTTPException(status_code=404, detail="Song not found")
    return song


@router.get("", response_model=list[SongOut])
def list_songs(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Song]:
    return list(db.scalars(select(Song).where(Song.user_id == user.id).order_by(Song.created_at.desc())))


@router.post("", response_model=SongOut, status_code=201)
def create_song(
    payload: SongWrite,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Song:
    title = payload.title.strip()
    artist = payload.artist.strip()
    if not title or not artist:
        raise HTTPException(status_code=422, detail="Title and artist are required")
    now = datetime.now(timezone.utc)
    song = Song(
        id=new_id("song"),
        user_id=user.id,
        title=title,
        artist=artist,
        album=blank_to_none(payload.album),
        url=blank_to_none(payload.url),
        lyrics=payload.lyrics,
        my_translation=payload.my_translation,
        reference_translation=payload.reference_translation,
        created_at=now,
        updated_at=now,
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


@router.patch("/{song_id}", response_model=SongOut)
def update_song(
    song_id: str,
    payload: SongUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Song:
    song = get_song_or_404(db, song_id, user.id)
    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=422, detail="Title is required")
        song.title = title
    if "artist" in data:
        artist = (data["artist"] or "").strip()
        if not artist:
            raise HTTPException(status_code=422, detail="Artist is required")
        song.artist = artist
    if "album" in data:
        song.album = blank_to_none(data["album"])
    if "url" in data:
        song.url = blank_to_none(data["url"])
    if "lyrics" in data:
        song.lyrics = data["lyrics"] or ""
    if "my_translation" in data:
        song.my_translation = data["my_translation"] or ""
    if "reference_translation" in data:
        song.reference_translation = data["reference_translation"] or ""
    song.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(song)
    return song


@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    song = get_song_or_404(db, song_id, user.id)
    db.delete(song)
    db.commit()
