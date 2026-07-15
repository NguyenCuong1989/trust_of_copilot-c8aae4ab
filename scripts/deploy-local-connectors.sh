#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)"
SECRETS_DIR="$HOME/.config/hyperai"
SECRETS_FILE="$SECRETS_DIR/connectors.env"
LOG_DIR="$HOME/Library/Logs/HyperAI"
AGENT_DIR="$HOME/Library/LaunchAgents"
SERVER_LABEL="ai.hyperai.connectors.server"
HEALTH_LABEL="ai.hyperai.connectors.health"

mkdir -p "$SECRETS_DIR" "$LOG_DIR" "$AGENT_DIR"

if [[ ! -f "$SECRETS_FILE" ]]; then
  umask 077
  {
    echo '# Local HyperAI connector secret store'
    echo 'NOTION_API_KEY='
    echo 'GITHUB_TOKEN='
    echo 'GITHUB_REPOSITORY=NguyenCuong1989/trust_of_copilot-c8aae4ab'
    echo 'TELEGRAM_BOT_TOKEN='
    echo 'PORT=3000'
    echo 'RUNTIME_NODE_ID=macbook_m2'
  } > "$SECRETS_FILE"
fi
chmod 600 "$SECRETS_FILE"

write_server_plist() {
  local target="$AGENT_DIR/$SERVER_LABEL.plist"
  sed     -e "s|__LABEL__|$SERVER_LABEL|g"     -e "s|__NODE__|$NODE_BIN|g"     -e "s|__WRAPPER__|$REPO_ROOT/scripts/run-with-local-secrets.sh|g"     -e "s|__LOG_DIR__|$LOG_DIR|g"     "$REPO_ROOT/launchd/connector-server.plist.template" > "$target"
}

write_health_plist() {
  local target="$AGENT_DIR/$HEALTH_LABEL.plist"
  sed     -e "s|__LABEL__|$HEALTH_LABEL|g"     -e "s|__NODE__|$NODE_BIN|g"     -e "s|__WRAPPER__|$REPO_ROOT/scripts/run-with-local-secrets.sh|g"     -e "s|__LOG_DIR__|$LOG_DIR|g"     "$REPO_ROOT/launchd/connector-health.plist.template" > "$target"
}

write_server_plist
write_health_plist

for label in "$SERVER_LABEL" "$HEALTH_LABEL"; do
  launchctl bootout "gui/$UID/$label" 2>/dev/null || true
done

launchctl bootstrap "gui/$UID" "$AGENT_DIR/$SERVER_LABEL.plist"
launchctl bootstrap "gui/$UID" "$AGENT_DIR/$HEALTH_LABEL.plist"
launchctl kickstart -k "gui/$UID/$SERVER_LABEL"
launchctl kickstart -k "gui/$UID/$HEALTH_LABEL"

echo "DEPLOYED"
echo "secret_store=$SECRETS_FILE"
echo "server_label=$SERVER_LABEL"
echo "health_label=$HEALTH_LABEL"
echo "logs=$LOG_DIR"
echo "NEXT: fill empty values in $SECRETS_FILE, keep mode 600, then rerun this installer."
