#!/usr/bin/env bash
# ==============================================================================
# Vault Enterprise Production Deployment Script for AWS EC2 (Ubuntu 22.04 / 24.04)
# ==============================================================================

set -e

echo "🚀 [1/6] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

echo "💾 [2/6] Allocating 2GB Swap Space (prevents OOM during builds on micro instances)..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap allocated successfully."
else
    echo "ℹ️ Swap file already exists."
fi

echo "🐳 [3/6] Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "ℹ️ Docker is already installed."
fi

echo "🛡️ [4/6] Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "📦 [5/6] Building & Launching Vault Microservices via Docker Compose..."
docker compose build --parallel
docker compose up -d

echo "📊 [6/6] Verifying Running Services..."
docker compose ps

echo "=============================================================================="
echo "🎉 Vault Enterprise Cloud Storage is LIVE on Port 80!"
echo "   Inspect logs anytime with: docker compose logs -f"
echo "=============================================================================="
