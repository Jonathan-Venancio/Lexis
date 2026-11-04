import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.reminders import reminder_loop, should_loop
from app.routers import auth, bootstrap, decks, profile, sentences, songs, words

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    stop = threading.Event()
    thread = None
    if should_loop():
        thread = threading.Thread(target=reminder_loop, args=(stop,), name="lexis-reminders", daemon=True)
        thread.start()
    yield
    stop.set()
    if thread is not None:
        thread.join(timeout=1)


app = FastAPI(title="Lexis", lifespan=lifespan)
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
