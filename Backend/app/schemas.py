from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_serializer


def to_camel(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(part.capitalize() for part in tail)


def as_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class APIModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class WordOut(APIModel):
    id: str
    term: str
    translation: str
    definition: str
    example: str
    notes: str | None = None
    part_of_speech: str | None = None
    status: str
    last_grade: str | None = None
    created_at: datetime
    difficulty: float
    review_count: int
    success_count: int
    last_reviewed_at: datetime | None = None
    next_review_at: datetime
    interval_days: int

    @field_serializer("created_at", "last_reviewed_at", "next_review_at")
    def _iso(self, value: datetime | None) -> str | None:
        return as_iso(value)


class WordCreate(APIModel):
    term: str
    translation: str
    definition: str = ""
    example: str = ""
    notes: str | None = None
    part_of_speech: str | None = None


class WordUpdate(APIModel):
    term: str | None = None
    translation: str | None = None
    definition: str | None = None
    example: str | None = None
    notes: str | None = None
    part_of_speech: str | None = None


class GradeIn(APIModel):
    grade: str = Field(pattern="^(again|hard|good|easy)$")


class SentenceOut(APIModel):
    id: str
    text: str
    translation: str | None = None
    notes: str | None = None
    created_at: datetime

    @field_serializer("created_at")
    def _iso(self, value: datetime | None) -> str | None:
        return as_iso(value)


class SentenceWrite(APIModel):
    text: str
    translation: str | None = None
    notes: str | None = None


class SentenceUpdate(APIModel):
    text: str | None = None
    translation: str | None = None
    notes: str | None = None


class SongOut(APIModel):
    id: str
    title: str
    artist: str
    album: str | None = None
    url: str | None = None
    lyrics: str
    my_translation: str
    reference_translation: str
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _iso(self, value: datetime | None) -> str | None:
        return as_iso(value)


class SongWrite(APIModel):
    title: str
    artist: str
    album: str | None = None
    url: str | None = None
    lyrics: str = ""
    my_translation: str = ""
    reference_translation: str = ""


class SongUpdate(APIModel):
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    url: str | None = None
    lyrics: str | None = None
    my_translation: str | None = None
    reference_translation: str | None = None


class DeckOut(APIModel):
    id: str
    name: str
    word_ids: list[str]
    created_at: datetime

    @field_serializer("created_at")
    def _iso(self, value: datetime | None) -> str | None:
        return as_iso(value)


class DeckCreate(APIModel):
    name: str
    word_ids: list[str] = []


class DeckWordsIn(APIModel):
    word_ids: list[str]


class ProfileOut(APIModel):
    name: str
    daily_goal: int
    streak_days: int


class ProfileUpdate(APIModel):
    name: str | None = None
    daily_goal: int | None = Field(default=None, ge=1, le=50)


class BootstrapOut(APIModel):
    words: list[WordOut]
    sentences: list[SentenceOut]
    songs: list[SongOut]
    decks: list[DeckOut]
    profile: ProfileOut
