#!/bin/bash
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_BIN="/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"

if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python3 || true)"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "Cannot find python3. Please install Python 3 or run this from Codex."
  exit 1
fi

exec "$PYTHON_BIN" "$SCRIPT_DIR/scripts/update_wechat_qr.py" "$@"
