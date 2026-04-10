#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8765}"
SESSION_NAME="codex-review-app-${PORT}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
pkill -f "$ROOT_DIR/tools/md_review_app/server.py --host 127.0.0.1 --port $PORT" 2>/dev/null || true
