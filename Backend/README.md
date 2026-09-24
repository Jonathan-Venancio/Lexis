# Lexis API

Python, FastAPI e SQLAlchemy. O backend é gerido pelo Poetry. O banco local é SQLite. No deploy, troque só a variável `DATABASE_URL` para Postgres.

```sh
cd Backend
poetry install
cp .env.example .env
poetry run alembic upgrade head
poetry run task run
```

`task run` abre dois terminais: um com a API e outro com o app. Para subir só um dos lados, no mesmo terminal:

```sh
poetry run task backend
poetry run task frontend
```

Com o ambiente do Poetry ativo, os comandos ficam `task run`, `task backend` e `task frontend`.

A API fica em http://127.0.0.1:8000 e a documentação interativa em http://127.0.0.1:8000/docs. O app fica em http://127.0.0.1:8080.

Os testes:

```sh
poetry run pytest
```

Para Postgres:

```sh
DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@localhost:5432/lexis poetry run alembic upgrade head
```

O driver `psycopg` já está nas dependências. O restante do código não muda.

As imagens de deploy são publicadas no Docker Hub pelo GitHub Actions. O passo a passo está em [docs/publicar-imagens-no-docker-hub.md](../docs/publicar-imagens-no-docker-hub.md).

No servidor, defina `JWT_SECRET` com um valor longo e aleatório. Ele assina o token de login. Sem essa variável o processo sobe, mas qualquer pessoa que conheça o segredo padrão consegue forjar um token.
