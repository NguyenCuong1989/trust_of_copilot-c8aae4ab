#!/bin/bash
set -euo pipefail

MODE="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="${HYPERAI_CONNECTOR_ENV:-$HOME/.config/hyperai/connectors.env}"

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
    exec node server.js
    ;;
  health)
    exec node scripts/connector-health.mjs
    ;;
  *)
    echo "Usage: $0 {server|health}" >&2
    exit 64
    ;;
esac
