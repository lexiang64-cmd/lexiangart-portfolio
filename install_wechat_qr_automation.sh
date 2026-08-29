#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/mac/Documents/Codex/2026-05-20/new-chat"
DROP_DIR="/Users/mac/Documents/Codex/WechatGroupQR"
LABEL="com.lexiangart.wechat-qr"
SOURCE_PLIST="$PROJECT_DIR/automation/$LABEL.plist"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$TARGET_DIR/$LABEL.plist"

if [ "$(id -u)" = "0" ]; then
  echo "Please do not run this as root or with sudo."
  exit 1
fi

mkdir -p "$TARGET_DIR" "$DROP_DIR/archive" "$DROP_DIR/logs"
cp "$SOURCE_PLIST" "$TARGET_PLIST"
chmod 644 "$TARGET_PLIST"

launchctl bootout "gui/$(id -u)" "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$TARGET_PLIST"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

echo "WeChat QR automation installed."
echo "Drop folder: $DROP_DIR"
echo "Logs: $DROP_DIR/logs"
