#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/mac/Documents/Codex/2026-05-20/new-chat"
SUPPORT_DIR="$HOME/Library/Application Support/LeoXiang/WeChatQRUpdater"
SUPPORT_REPO="$SUPPORT_DIR/repo"
DROP_DIR="$HOME/WechatGroupQR"
LOG_DIR="$DROP_DIR/logs"
LABEL="com.lexiangart.wechat-qr"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
REMOTE_URL="git@github.com-lexiangart:lexiang64-cmd/lexiangart-portfolio.git"

if [ "$(id -u)" = "0" ]; then
  echo "Please do not run this as root or with sudo."
  exit 1
fi

mkdir -p "$SUPPORT_DIR" "$DROP_DIR/archive" "$LOG_DIR" "$HOME/Library/LaunchAgents"

cp "$PROJECT_DIR/scripts/update_wechat_qr.py" "$SUPPORT_DIR/update_wechat_qr.py"
chmod 755 "$SUPPORT_DIR/update_wechat_qr.py"

if [ ! -d "$SUPPORT_REPO/.git" ]; then
  echo "Creating automation Git working copy in:"
  echo "$SUPPORT_REPO"
  git clone "$REMOTE_URL" "$SUPPORT_REPO"
else
  echo "Updating automation Git working copy..."
  git -C "$SUPPORT_REPO" fetch origin
  git -C "$SUPPORT_REPO" checkout main
  git -C "$SUPPORT_REPO" pull --ff-only
fi

cat > "$SUPPORT_DIR/run_wechat_qr_update.sh" <<EOF
#!/bin/bash
set -u
export WECHAT_QR_PROJECT_DIR="$SUPPORT_REPO"
export WECHAT_QR_DROP_DIR="$DROP_DIR"
export GIT_TERMINAL_PROMPT=0
export GCM_INTERACTIVE=Never
export PATH="/usr/bin:/bin:/usr/sbin:/sbin"
cd "$SUPPORT_DIR" || exit 1
/usr/bin/python3 "$SUPPORT_DIR/update_wechat_qr.py"
EOF
chmod 755 "$SUPPORT_DIR/run_wechat_qr_update.sh"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>$SUPPORT_DIR/run_wechat_qr_update.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SUPPORT_DIR</string>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.err.log</string>
  </dict>
</plist>
EOF
chmod 644 "$PLIST_PATH"

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

echo "LaunchAgent repaired."
echo "Background script: $SUPPORT_DIR/run_wechat_qr_update.sh"
echo "Drop folder: $DROP_DIR"
echo "Logs: $LOG_DIR"
