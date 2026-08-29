#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/mac/Documents/Codex/2026-05-20/new-chat"
KEY_PATH="$HOME/.ssh/lexiangart_github_ed25519"
HOST_ALIAS="github.com-lexiangart"
REMOTE_URL="git@${HOST_ALIAS}:lexiang64-cmd/lexiangart-portfolio.git"
SSH_CONFIG="$HOME/.ssh/config"
GITHUB_SSH_KEYS_URL="https://github.com/settings/ssh/new"

if [ "$(id -u)" = "0" ]; then
  echo "Please do not run this as root or with sudo."
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [ ! -f "$KEY_PATH" ]; then
  echo "Creating a new SSH key for lexiangart.com GitHub updates..."
  ssh-keygen -t ed25519 -C "lexiangart-portfolio@lexiangart.com" -f "$KEY_PATH" -N ""
fi

chmod 600 "$KEY_PATH"
chmod 644 "$KEY_PATH.pub"

if ! ssh-keygen -l -f "$KEY_PATH.pub" >/dev/null 2>&1; then
  echo "The existing public key is invalid, so I will create a fresh ed25519 key pair."
  mv "$KEY_PATH" "$KEY_PATH.broken.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
  mv "$KEY_PATH.pub" "$KEY_PATH.pub.broken.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
  ssh-keygen -t ed25519 -C "lexiangart-portfolio@lexiangart.com" -f "$KEY_PATH" -N ""
  chmod 600 "$KEY_PATH"
  chmod 644 "$KEY_PATH.pub"
fi

if ! grep -Eq '^ssh-ed25519 [A-Za-z0-9+/=]+( .*)?$' "$KEY_PATH.pub"; then
  echo "Public key is not in GitHub OpenSSH ed25519 format."
  echo "Expected format starts with: ssh-ed25519"
  exit 1
fi

if ! grep -q "Host ${HOST_ALIAS}" "$SSH_CONFIG" 2>/dev/null; then
  {
    echo ""
    echo "# Leo Xiang website QR updater"
    echo "Host ${HOST_ALIAS}"
    echo "  HostName github.com"
    echo "  User git"
    echo "  IdentityFile ${KEY_PATH}"
    echo "  IdentitiesOnly yes"
  } >> "$SSH_CONFIG"
  chmod 600 "$SSH_CONFIG"
fi

PUBLIC_KEY_CONTENT="$(cat "$KEY_PATH.pub")"

copy_with_osascript() {
  /usr/bin/python3 - "$PUBLIC_KEY_CONTENT" <<'PY'
import subprocess
import sys

key = sys.argv[1]
escaped = key.replace("\\", "\\\\").replace('"', '\\"')
subprocess.run(
    ["/usr/bin/osascript", "-e", f'set the clipboard to "{escaped}"'],
    check=True,
)
PY
}

if command -v pbcopy >/dev/null 2>&1; then
  printf "%s" "$PUBLIC_KEY_CONTENT" | /usr/bin/pbcopy
fi

CLIPBOARD_CONTENT="$(/usr/bin/pbpaste 2>/dev/null || true)"

if [ "$CLIPBOARD_CONTENT" != "$PUBLIC_KEY_CONTENT" ] && [ -x /usr/bin/osascript ]; then
  copy_with_osascript
  CLIPBOARD_CONTENT="$(/usr/bin/pbpaste 2>/dev/null || true)"
fi

if [ "$CLIPBOARD_CONTENT" != "$PUBLIC_KEY_CONTENT" ]; then
  echo "Could not verify the clipboard copy."
  echo "No private key was copied."
  echo "Please run this command file again from Finder."
  exit 1
fi

echo "Public key copied to clipboard"
echo "Public key starts with: $(printf "%s" "$PUBLIC_KEY_CONTENT" | awk '{print $1}')"
echo "No private key was copied."

echo ""
echo "Testing GitHub SSH access..."
set +e
SSH_OUTPUT="$(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T "git@${HOST_ALIAS}" 2>&1)"
SSH_STATUS=$?
set -e

if echo "$SSH_OUTPUT" | grep -qi "successfully authenticated"; then
  echo "GitHub SSH authentication is working."
  cd "$PROJECT_DIR"
  git remote set-url origin "$REMOTE_URL"
  echo "Remote switched to: $REMOTE_URL"
  echo "Trying to push the current branch..."
  git push
  echo "Push finished successfully."
  exit 0
fi

echo ""
echo "GitHub does not recognize this SSH key yet."
echo "I opened the GitHub SSH key page for you."
echo ""
echo "What to do now:"
echo "1. In GitHub, paste the copied key into the Key box."
echo "2. Title can be: lexiangart QR updater"
echo "3. Click Add SSH key."
echo "4. Then double-click this file again."
echo ""
echo "Public key location:"
echo "$KEY_PATH.pub"

if command -v open >/dev/null 2>&1; then
  open "$GITHUB_SSH_KEYS_URL"
fi
