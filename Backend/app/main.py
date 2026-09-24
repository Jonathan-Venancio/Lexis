from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, bootstrap, decks, profile, sentences, songs, words

settings = get_settings()

app = FastAPI(title="Lexis")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bootstrap.router)
app.include_router(words.router)
app.include_router(sentences.router)
app.include_router(songs.router)
app.include_router(decks.router)
app.include_router(profile.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
