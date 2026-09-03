#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Full Deployment..."
echo "📅 Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "📂 Working Directory: $PROJECT_DIR"
echo "=================================================="

cd "$PROJECT_DIR"

echo "📥 [1/4] Pulling latest changes from git origin/main..."
git pull origin main

echo "🧪 [2/4] Running Frontend Automated Test Suite..."
cd "$PROJECT_DIR/Frontend"
npm run test

echo "🏗️ [3/4] Building Frontend & Syncing to S3 + CloudFront..."
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete
aws cloudfront create-invalidation --distribution-id E1GUK9KTGYZNFE --paths "/*"

echo "⚙️ [4/4] Updating Backend & Reloading PM2 Cluster..."
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
echo "✅ [CI/CD Pipeline] Deployment Completed Successfully!"
echo "=================================================="
