#!/usr/bin/env bash
# Convenience root wrapper delegating to scripts/deploy-full.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/scripts/deploy-full.sh" "$@"
