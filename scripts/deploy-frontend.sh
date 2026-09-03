#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Frontend Deployment..."
echo "📅 Timestamp:        $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "📦 Commit ID:        [${TRIGGERED_COMMIT:-HEAD}]"
echo "💬 Commit Message:   \"${TRIGGERED_MESSAGE:-No commit message}\""
echo "👤 Author:           ${TRIGGERED_AUTHOR:-Unknown}"
echo "📂 Working Directory: $PROJECT_DIR"
echo "=================================================="

cd "$PROJECT_DIR"

# Capture current local commit before sync to check diffs
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥 [1/3] Syncing latest changes from git origin/main..."
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

# Check if Frontend dependencies changed
FRONTEND_PKG_CHANGED=""
if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$(git rev-parse HEAD)" ]; then
  FRONTEND_PKG_CHANGED=$(git diff --name-only "$PREV_COMMIT" HEAD -- "$PROJECT_DIR/Frontend/package.json" "$PROJECT_DIR/Frontend/package-lock.json" 2>/dev/null || true)
fi

echo "🧪 [2/3] Running Frontend Automated Test Suite..."
cd "$PROJECT_DIR/Frontend"

# Smart install for Frontend
if [ ! -d "$PROJECT_DIR/Frontend/node_modules" ] || [ -n "$FRONTEND_PKG_CHANGED" ]; then
  echo "📦 [Frontend] Package changes detected (or node_modules missing). Installing frontend dependencies..."
  npm install
else
  echo "⚡ [Frontend] No package.json changes detected. Skipping npm install."
fi

npm run test

echo "🏗️ [3/3] Building Frontend & Syncing to S3 + CloudFront..."
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete
aws cloudfront create-invalidation --distribution-id E1GUK9KTGYZNFE --paths "/*"

echo "=================================================="
echo "✅ [CI/CD Pipeline] Frontend Deployed Successfully!"
echo "=================================================="
