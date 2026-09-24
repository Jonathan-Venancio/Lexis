FROM python:3.12-slim-bookworm AS build

ENV POETRY_VERSION=2.4.1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_NO_INTERACTION=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN pip install --no-cache-dir "poetry==${POETRY_VERSION}"

WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-ansi

FROM python:3.12-slim-bookworm

WORKDIR /app

RUN useradd --create-home --uid 1000 --shell /usr/sbin/nologin lexis \
    && mkdir -p /app/data \
    && chown -R lexis:lexis /app

COPY --from=build --chown=lexis:lexis /app/.venv /app/.venv
COPY --chown=lexis:lexis app ./app
COPY --chown=lexis:lexis alembic ./alembic
COPY --chown=lexis:lexis alembic.ini ./
COPY --chown=lexis:lexis docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER lexis

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    CORS_ORIGINS=https://lexis.jonathanvenancio.site \
    DATABASE_URL=sqlite:///./data/lexis.db

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"

ENTRYPOINT ["/entrypoint.sh"]
