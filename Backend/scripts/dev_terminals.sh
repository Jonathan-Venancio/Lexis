#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v ptyxis >/dev/null 2>&1; then
  echo "O task run precisa do Ptyxis para abrir os dois terminais." >&2
  exit 1
fi

launch() {
  local title="$1"
  local script="$2"
  ptyxis --new-window --title "$title" -- bash -lc \
    "export PATH=\"\$HOME/.local/bin:\$PATH\"; $(printf '%q' "$script"); status=\$?; echo; printf 'Encerrou (%s). Enter para fechar.\n' \"\$status\"; read"
}

launch "Lexis API" "${here}/backend.sh"
launch "Lexis" "${here}/frontend.sh"
