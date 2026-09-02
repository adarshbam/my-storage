git pull
npm run test
npm run build
aws s3 sync ./dist s3://yourvaultstoragefrontend --delete