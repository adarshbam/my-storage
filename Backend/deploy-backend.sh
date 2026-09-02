set -e

cd ~/my-storage
git pull origin main
cd Backend
pm2 restart vault-backend