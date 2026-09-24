from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(80))
    daily_goal: Mapped[int] = mapped_column(Integer, default=10)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Word(Base):
    __tablename__ = "words"
    __table_args__ = (UniqueConstraint("user_id", "term_key", name="uq_word_user_term"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    term: Mapped[str] = mapped_column(String(200))
    term_key: Mapped[str] = mapped_column(String(200))
    translation: Mapped[str] = mapped_column(String(400))
    definition: Mapped[str] = mapped_column(Text, default="")
    example: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    part_of_speech: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="new")
    last_grade: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    difficulty: Mapped[float] = mapped_column(Float, default=3)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_review_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    interval_days: Mapped[int] = mapped_column(Integer, default=0)

    deck_links: Mapped[list["DeckWord"]] = relationship(back_populates="word", cascade="all, delete-orphan")


class Sentence(Base):
    __tablename__ = "sentences"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    artist: Mapped[str] = mapped_column(String(300))
    album: Mapped[str | None] = mapped_column(String(300), nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lyrics: Mapped[str] = mapped_column(Text, default="")
    my_translation: Mapped[str] = mapped_column(Text, default="")
    reference_translation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    words: Mapped[list["DeckWord"]] = relationship(
        back_populates="deck",
        cascade="all, delete-orphan",
        order_by="DeckWord.position",
    )


class DeckWord(Base):
    __tablename__ = "deck_words"
    __table_args__ = (UniqueConstraint("deck_id", "word_id", name="uq_deck_word"),)

    deck_id: Mapped[str] = mapped_column(ForeignKey("decks.id", ondelete="CASCADE"), primary_key=True)
    word_id: Mapped[str] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    deck: Mapped[Deck] = relationship(back_populates="words")
    word: Mapped[Word] = relationship(back_populates="deck_links")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), default="")
    daily_goal: Mapped[int] = mapped_column(Integer, default=10)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
