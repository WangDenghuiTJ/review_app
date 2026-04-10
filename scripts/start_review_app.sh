#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${1:-127.0.0.1}"
PORT="${2:-8765}"
DEFAULT_PATH="${3:-workflow_review.md}"
IDLE_TIMEOUT="${4:-0}"
LOG_DIR="$ROOT_DIR/logs"
OUT_LOG="$LOG_DIR/review_app.out"
ERR_LOG="$LOG_DIR/review_app.err"
SESSION_NAME="codex-review-app-${PORT}"
ENCODED_PATH="$(python3 - "$DEFAULT_PATH" <<'PY'
import sys
from urllib.parse import quote
print(quote(sys.argv[1]))
PY
)"
HEALTH_URL="http://${HOST}:${PORT}/api/file?path=${ENCODED_PATH}"
OPEN_URL="http://${HOST}:${PORT}/?path=${ENCODED_PATH}"

mkdir -p "$LOG_DIR"

if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "$OPEN_URL"
  exit 0
fi

tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
pkill -f "$ROOT_DIR/tools/md_review_app/server.py --host $HOST --port $PORT" 2>/dev/null || true
tmux new-session -d -s "$SESSION_NAME" \
  "cd '$ROOT_DIR' && exec python3 '$ROOT_DIR/tools/md_review_app/server.py' --host '$HOST' --port '$PORT' --idle-timeout '$IDLE_TIMEOUT' >'$OUT_LOG' 2>'$ERR_LOG'"

for _ in $(seq 1 20); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "$OPEN_URL"
    exit 0
  fi
  sleep 0.5
done

echo "Failed to start Review App. Check $OUT_LOG and $ERR_LOG" >&2
exit 1
