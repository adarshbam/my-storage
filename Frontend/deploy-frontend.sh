set -e

cd ~/my-storage
git pull origin main
cd Frontend
npm run test
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete
aws cloudfront create-invalidation --distribution-id E1GUK9KTGYZNFE --paths "/*"