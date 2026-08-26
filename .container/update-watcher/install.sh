#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${CODELOGICX_WATCHER_REPO_DIR:-/home/codelogicx}"
SOURCE_DIR="$REPO_DIR/.container/update-watcher"
[[ "$(id -u)" == 0 ]] || { echo "Run this installer as root." >&2; exit 77; }
command -v systemctl >/dev/null 2>&1 || { echo "systemd is required." >&2; exit 69; }
[[ -f "$SOURCE_DIR/codelogicx-update-watcher.sh" ]] || { echo "Watcher source is missing: $SOURCE_DIR" >&2; exit 78; }

install -o root -g root -m 0750 "$SOURCE_DIR/codelogicx-update-watcher.sh" /usr/local/sbin/codelogicx-update-watcher
install -o root -g root -m 0644 "$SOURCE_DIR/codelogicx-update-watcher.service" /etc/systemd/system/codelogicx-update-watcher.service
install -o root -g root -m 0644 "$SOURCE_DIR/codelogicx-update-watcher.timer" /etc/systemd/system/codelogicx-update-watcher.timer
install -d -o root -g root -m 0750 /var/lib/codelogicx-update-watcher
systemctl daemon-reload
systemctl enable --now codelogicx-update-watcher.timer
systemctl status codelogicx-update-watcher.timer --no-pager

echo "Installed CodeLogicX update watcher. Inspect it with:"
echo "  systemctl start codelogicx-update-watcher.service"
echo "  journalctl -u codelogicx-update-watcher.service -n 100 --no-pager"
