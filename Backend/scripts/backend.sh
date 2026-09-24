#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
export PATH="${HOME}/.local/bin:${PATH}"
exec poetry run uvicorn app.main:app --reload --port 8000
