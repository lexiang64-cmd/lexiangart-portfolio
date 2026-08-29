#!/bin/bash
cd "/Users/mac/Documents/Codex/2026-05-20/new-chat" || exit 1
./update_wechat_qr.sh
echo
echo "Finished. You can close this window."
read -r -p "Press Enter to close..."
