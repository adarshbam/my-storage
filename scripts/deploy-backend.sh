#!/usr/bin/env bash
set -e

PROJECT_DIR="${PROJECT_DIR:-$HOME/my-storage}"

echo "=================================================="
echo "🚀 [CI/CD Pipeline] Starting Backend Deployment..."
echo "📅 Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "=================================================="

cd "$PROJECT_DIR"
echo "📥 [1/2] Pulling latest changes from git origin/main..."
git pull origin main

echo "⚙️ [2/2] Updating Backend Dependencies & Reloading PM2..."
cd "$PROJECT_DIR/Backend"
npm install --omit=dev
pm2 reload vault-backend || pm2 restart vault-backend

echo "=================================================="
echo "✅ [CI/CD Pipeline] Backend Deployed Successfully!"
echo "=================================================="
