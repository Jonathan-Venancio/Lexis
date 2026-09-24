from fastapi import APIRouter

from app.routers import bootstrap, decks, profile, sentences, songs, words

api = APIRouter()
api.include_router(bootstrap.router)
api.include_router(words.router)
api.include_router(sentences.router)
api.include_router(songs.router)
api.include_router(decks.router)
api.include_router(profile.router)
