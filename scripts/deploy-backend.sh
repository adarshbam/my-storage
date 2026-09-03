#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Backend Deployment..."
echo "📅 Timestamp:        $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "📦 Commit ID:        [${TRIGGERED_COMMIT:-HEAD}]"
echo "💬 Commit Message:   \"${TRIGGERED_MESSAGE:-No commit message}\""
echo "👤 Author:           ${TRIGGERED_AUTHOR:-Unknown}"
echo "📂 Working Directory: $PROJECT_DIR"
echo "=================================================="

cd "$PROJECT_DIR"

# Capture current local commit before sync to check diffs
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥 [1/2] Syncing latest changes from git origin/main..."
git fetch origin main
git reset --hard origin/main
git clean -fd -e ".env" -e "node_modules"
chmod +x "$PROJECT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$PROJECT_DIR"/*.sh 2>/dev/null || true

# Display synced commit info from git directly
SYNCED_HASH=$(git rev-parse --short HEAD)
SYNCED_MSG=$(git log -1 --pretty=format:"%s")
SYNCED_AUTHOR=$(git log -1 --pretty=format:"%an")
echo "=================================================="
echo "✅ Synced to Git Commit: [$SYNCED_HASH]"
echo "💬 Commit Message:       \"$SYNCED_MSG\""
echo "👤 Commit Author:        $SYNCED_AUTHOR"
echo "=================================================="

# Check if Backend dependencies changed
BACKEND_PKG_CHANGED=""
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$(git rev-parse HEAD)" ]; then
  BACKEND_PKG_CHANGED=$(git diff --name-only "$PREV_COMMIT" HEAD -- "$PROJECT_DIR/Backend/package.json" "$PROJECT_DIR/Backend/package-lock.json" 2>/dev/null || true)
fi

echo "⚙️ [2/2] Updating Backend Dependencies & Reloading PM2..."
cd "$PROJECT_DIR/Backend"

# Smart install for Backend with native script approvals & builds
if [ ! -d "$PROJECT_DIR/Backend/node_modules" ] || [ -n "$BACKEND_PKG_CHANGED" ]; then
  echo "📦 [Backend] Package changes detected (or node_modules missing). Running full install & build..."

  if command -v npm &> /dev/null; then
    npm install-scripts approve @ffmpeg-installer/linux-x64 argon2 protobufjs @firebase/util 2>/dev/null || true
  fi

  npm install --omit=dev
  npm rebuild argon2 2>/dev/null || true
  chmod +x node_modules/@ffmpeg-installer/linux-x64/ffmpeg 2>/dev/null || true
else
  echo "⚡ [Backend] No package.json changes detected. Skipping npm install."
fi

if [ -f "$PROJECT_DIR/ecosystem.config.cjs" ]; then
  pm2 reload "$PROJECT_DIR/ecosystem.config.cjs" --update-env || pm2 reload vault-backend --update-env
else
  pm2 reload vault-backend --update-env
fi

echo "=================================================="
echo "✅ [CI/CD Pipeline] Backend Deployed Successfully!"
echo "=================================================="
