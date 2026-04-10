#!/usr/bin/env bash
set -euo pipefail

DOC_PATH="${1:-workflow_review.md}"
HOST="${2:-127.0.0.1}"
PORT="${3:-8765}"

python3 - "$DOC_PATH" "$HOST" "$PORT" <<'PY'
import sys
from urllib.parse import quote

doc_path, host, port = sys.argv[1], sys.argv[2], sys.argv[3]
print(f"http://{host}:{port}/?path={quote(doc_path)}")
PY
