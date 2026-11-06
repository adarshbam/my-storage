# Vault API

Express services for files, folders, accounts, sharing, connected workspaces, and plans.

[Application overview](../README.md) · [Architecture](../docs/ARCHITECTURE.md) · [Routes](../docs/API.md) · [Security](../docs/SECURITY.md)

## Responsibilities

- Authorize requests and apply route-specific plan, feature, and rate limits.
- Maintain MongoDB metadata and Redis-backed sessions/caches.
- Sign B2 uploads, finalize multipart objects, and issue media-delivery tokens.
- Connect GitHub/Drive operations and Vault-backed Git workspaces.
- Handle sharing, owner controls, subscriptions, and payment webhooks.

## Local setup

Use Node.js 24, MongoDB, Redis, and configured object storage. Copy [.env.example](.env.example) to `.env`; configure values for your own environment. [config/config.js](config/config.js) defines core names such as `DB_URL`, `REDIS_URL`, `CLIENT_URL`, `BACKEND_URL`, and `SESSION_SECRET`. Do not rely on fallback demonstration/session values for a deployed service.

From this directory:

```sh
npm install
npm run dev
```

The default API port is `4000`. The frontend defaults to `http://localhost:5173`; origins, callbacks, cookie policy, storage CORS, and provider credentials must agree. MongoDB transaction-backed operations require a compatible deployment, such as a replica set. Optional integrations require their own configuration.

`npm start` launches `app.js`; development uses the package's `.env` loading path. [package.json](package.json) is the command reference.

## Source map

| Layer | Location |
| --- | --- |
| Router mounts and request policy | [app.js](app.js) |
| Route methods, validation, and middleware | [routes/](routes/) |
| HTTP handlers | [controllers/](controllers/) |
| File, Git, Drive, sharing, and billing behavior | [services/](services/) |
| Metadata schemas | [models/](models/) |
| Storage/CDN clients | [integrations/](integrations/) |

## Checks

Focused helper suites can be run individually:

```sh
node tests/security.test.js
node tests/email-templates.test.js
node tests/notifications.test.js
```

They cover their named helpers, not every HTTP, OAuth, transfer, payment, or recovery path. This documentation refresh does not assert a new pass count. The frontend's placeholder test command is not an end-to-end verification of this API.

## Operating the service

Review the repository's [backend deployment script](../scripts/deploy-backend.sh), [PM2 configuration](../ecosystem.config.cjs), [Nginx configuration](../nginx/nginx.conf), and [Compose definition](../docker-compose.yml) against your own environment. They can change running services. Source configuration is not a deployment result or a hardening audit.
