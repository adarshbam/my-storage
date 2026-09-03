#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Full Deployment..."
echo "📅 Timestamp:        $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "📦 Commit ID:        [${TRIGGERED_COMMIT:-HEAD}]"
echo "💬 Commit Message:   \"${TRIGGERED_MESSAGE:-No commit message}\""
echo "👤 Author:           ${TRIGGERED_AUTHOR:-Unknown}"
echo "📂 Working Directory: $PROJECT_DIR"
echo "=================================================="

cd "$PROJECT_DIR"

# Capture current local commit before sync to check diffs
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥 [1/4] Syncing latest changes from git origin/main..."
git fetch origin main
git reset --hard origin/main
git clean -fd -e ".env" -e "node_modules"
chmod +x "$PROJECT_DIR"/scripts/*.sh 2>/dev/null || true
chmod +x "$PROJECT_DIR"/*.sh 2>/dev/null || true

# Display synced commit info from git directly
SYNCED_HASH=$(git rev-parse --short HEAD)
SYNCED_MSG=$(git log -1 --pretty=format:"%s")
SYNCED_AUTHOR=$(git log -1 --pretty=format:"%an")
echo "✅ Synced to Git Commit: [$SYNCED_HASH] - \"$SYNCED_MSG\" by $SYNCED_AUTHOR"

# Check if Frontend dependencies changed
FRONTEND_PKG_CHANGED=""
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$(git rev-parse HEAD)" ]; then
  FRONTEND_PKG_CHANGED=$(git diff --name-only "$PREV_COMMIT" HEAD -- "$PROJECT_DIR/Frontend/package.json" "$PROJECT_DIR/Frontend/package-lock.json" 2>/dev/null || true)
fi

echo "🧪 [2/4] Running Frontend Automated Test Suite..."
cd "$PROJECT_DIR/Frontend"

# Smart install for Frontend
if [ ! -d "$PROJECT_DIR/Frontend/node_modules" ] || [ -n "$FRONTEND_PKG_CHANGED" ]; then
  echo "📦 [Frontend] Package changes detected (or node_modules missing). Installing frontend dependencies..."
  npm install
else
  echo "⚡ [Frontend] No package.json changes detected. Skipping npm install."
fi

npm run test

echo "🏗️ [3/4] Building Frontend & Syncing to S3 + CloudFront..."
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete
aws cloudfront create-invalidation --distribution-id E1GUK9KTGYZNFE --paths "/*"

# Check if Backend dependencies changed
BACKEND_PKG_CHANGED=""
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$(git rev-parse HEAD)" ]; then
  BACKEND_PKG_CHANGED=$(git diff --name-only "$PREV_COMMIT" HEAD -- "$PROJECT_DIR/Backend/package.json" "$PROJECT_DIR/Backend/package-lock.json" 2>/dev/null || true)
fi

echo "⚙️ [4/4] Updating Backend & Reloading PM2 Cluster..."
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

pm2 reload vault-backend --update-env || pm2 restart vault-backend --update-env

echo "=================================================="
echo "✅ [CI/CD Pipeline] Deployment Completed Successfully!"
echo "=================================================="
