#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Backend Deployment..."
echo "📅 Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

cd "$PROJECT_DIR"
echo "📥 [1/2] Syncing latest changes from git origin/main..."
git fetch origin main
git reset --hard origin/main
git clean -fd -e ".env" -e "node_modules"
chmod +x "$PROJECT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$PROJECT_DIR"/*.sh 2>/dev/null || true

echo "⚙️ [2/2] Updating Backend Dependencies & Reloading PM2..."
cd "$PROJECT_DIR/Backend"

# Approve install scripts for critical native/binary packages if npm install-scripts is enabled
if command -v npm &> /dev/null; then
  npm install-scripts approve @ffmpeg-installer/linux-x64 argon2 protobufjs @firebase/util 2>/dev/null || true
fi

npm install --omit=dev

# Rebuild native addons and grant executable permissions
npm rebuild argon2 2>/dev/null || true
chmod +x node_modules/@ffmpeg-installer/linux-x64/ffmpeg 2>/dev/null || true

pm2 reload vault-backend --update-env || pm2 restart vault-backend --update-env

echo "=================================================="
echo "✅ [CI/CD Pipeline] Backend Deployed Successfully!"
echo "=================================================="
