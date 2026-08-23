# Vault Storage CDN Worker (`vault-storage-cdn`)

This directory contains the source-controlled Cloudflare Worker for Vault Storage file and thumbnail delivery from private Backblaze B2 storage.

## Architecture

```
Authenticated User (Express App)
  ↓ (generates HMAC signed URL)
Cloudflare Worker (vault-storage-cdn)
  ↓ (authenticates via B2 API)
Private Backblaze B2 Bucket (secure-vault-storage)
```

## Structure

```
cloudflare-worker/
├── src/
│   └── worker.js         # Exact source code of deployed Worker
├── wrangler.toml         # Wrangler configuration targeting 'vault-storage-cdn'
├── package.json          # Node scripts and wrangler dependency
├── .dev.vars.example     # Secrets template for local testing
└── .gitignore            # Excludes node_modules, .wrangler, and .dev.vars
```

## Environment Secrets (Configured on Cloudflare)

The production worker relies on the following secrets configured in Cloudflare Dashboard / Wrangler secrets:
- `CDN_SIGNING_SECRET`: HMAC-SHA256 secret used to verify signed URLs (`${path}:${expires}`).
- `B2_APPLICATION_KEY_ID`: Backblaze B2 Application Key ID.
- `B2_APPLICATION_KEY`: Backblaze B2 Application Key.

> **Security**: Never commit secrets or `.dev.vars` to Git.

## Commands

- **Install dependencies locally**:
  ```bash
  npm install
  ```

- **Run local development server**:
  ```bash
  npm run dev
  ```
  *(Requires `.dev.vars` configured locally)*

- **Deploy to Cloudflare (Updates existing `vault-storage-cdn` worker)**:
  ```bash
  npm run deploy
  ```
  *(Requires running `npx wrangler login` once beforehand)*

- **Tail live logs**:
  ```bash
  npm run tail
  ```
