#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Frontend Deployment..."
echo "📅 Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

cd "$PROJECT_DIR"
echo "📥 [1/3] Pulling latest changes from git origin/main..."
git pull origin main

echo "🧪 [2/3] Running Frontend Automated Test Suite..."
cd "$PROJECT_DIR/Frontend"
npm run test

echo "🏗️ [3/3] Building Frontend & Syncing to S3 + CloudFront..."
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete
aws cloudfront create-invalidation --distribution-id E1GUK9KTGYZNFE --paths "/*"

echo "=================================================="
echo "✅ [CI/CD Pipeline] Frontend Deployed Successfully!"
echo "=================================================="
