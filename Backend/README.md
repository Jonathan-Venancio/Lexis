# Lexis API

Python, FastAPI e SQLAlchemy. O banco local é SQLite. No deploy, troque só a variável `DATABASE_URL` para Postgres.

```sh
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

A documentação interativa fica em http://127.0.0.1:8000/docs.

Para Postgres:

```sh
DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@localhost:5432/lexis alembic upgrade head
```

O driver `psycopg` já está nas dependências. O restante do código não muda.
