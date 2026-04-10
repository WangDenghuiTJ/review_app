#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${1:-127.0.0.1}"
PORT="${2:-8765}"
IDLE_TIMEOUT="${3:-0}"

cd "$ROOT_DIR"
exec python3 "$ROOT_DIR/tools/md_review_app/server.py" --host "$HOST" --port "$PORT" --idle-timeout "$IDLE_TIMEOUT"
