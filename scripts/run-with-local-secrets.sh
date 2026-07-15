#!/bin/bash
set -euo pipefail

MODE="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="${HYPERAI_CONNECTOR_ENV:-$HOME/.config/hyperai/connectors.env}"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Node runtime not found or not executable: $NODE_BIN" >&2
  exit 69
fi

if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Missing local secret store: $SECRETS_FILE" >&2
  exit 78
fi

PERMS="$(stat -f '%Lp' "$SECRETS_FILE" 2>/dev/null || stat -c '%a' "$SECRETS_FILE" 2>/dev/null || true)"
if [[ "$PERMS" != "600" ]]; then
  echo "Unsafe secret-store permissions: $PERMS (expected 600)" >&2
  exit 77
fi

set -a
# shellcheck disable=SC1090
source "$SECRETS_FILE"
set +a

cd "$REPO_ROOT"

case "$MODE" in
  server)
    exec "$NODE_BIN" server.js
    ;;
  health)
    exec "$NODE_BIN" scripts/connector-health.mjs
    ;;
  *)
    echo "Usage: $0 {server|health}" >&2
    exit 64
    ;;
esac
