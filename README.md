# Vault Storage

A connected workspace for Vault files, GitHub repositories, and Google Drive.

[Explore the demo](https://yourvaultstorage.com/) · [GitHub adapter](Backend/services/github.service.js) · [Drive adapter](Backend/services/drive.service.js)

## Origin and my contribution

Built on the ProCodrr Node.js course storage project taught by Anurag Singh. I contributed to teaching and course development for that foundation.

I independently built the GitHub and Google Drive integrations and their React workspaces, cross-service transfer extensions, owner controls, runtime plan rules, and billing.

## What to explore

- **Connected workspaces:** browse GitHub repositories and Drive folders alongside Vault storage; create repositories and work with repository files and branches.
- **Transfers:** Vault ↔ Google Drive and Vault → GitHub transfer paths. Do not assume a direct Drive ↔ GitHub operation.
- **Owner controls and plans:** owner-managed configuration, Redis invalidation after plan edits, and per-request entitlement resolution for feature access.
- **File upload and delivery:** the browser requests signed multipart URLs, uploads parts directly to Backblaze B2, then asks the API to finalize. A Cloudflare Worker checks signed reads before cache/origin access.

React · Node.js · Express · MongoDB · Redis · Backblaze B2 · Cloudflare Workers.

## Architecture and tradeoffs

The API handles authorization, metadata, signing, and completion; browser upload bytes go directly to B2. Signed delivery follows browser → Worker → cache or B2. GitHub and Drive are separate integrations, not required hops in that upload path.

| Decision | Benefit | Tradeoff |
| --- | --- | --- |
| GitHub REST Contents and Refs | Repository operations without a local clone | Per-file Contents writes are not atomic multi-file tree commits |
| Direct multipart uploads | File bytes bypass the API upload path | Client coordinates parts, ETags, retries, and completion |
| Signed Worker reads | Signature and expiry checks precede cache lookup | Cache freshness and signed-link lifetime need separate consideration |
| Runtime entitlement resolution | Requests use current plan rules after owner edits | Source presence does not establish a tested paid subscription lifecycle |

## Evidence and boundaries

Portfolio checks recorded on 25 October 2026 include a small multipart upload with byte-identical signed downloads, Vault ↔ Drive API copies, and Vault → GitHub transfer, branch, commit, and comparison operations in a disposable repository.

Those checks do not establish successful move/delete semantics, transfer byte integrity across every provider, direct Drive ↔ GitHub transfers, checkout completion, or ordinary paid-tier expiry enforcement. Owner settings and billing screens were observed; plan enforcement was source-reviewed. A permanent demo account is not evidence of the ordinary paid lifecycle.

No production-scale, latency, zero-egress-cost, or absolute-security guarantee is made. Cloud/provider limits and billing depend on configuration and current service terms.

## Implementation entry points

- [Upload manager](Frontend/src/hooks/useUploadManager.js)
- [Storage signing](Backend/integrations/storage/s3.client.js)
- [Signed delivery Worker](cloudflare-worker/src/worker.js)
- [GitHub integration](Backend/services/github.service.js) and [Drive integration](Backend/services/drive.service.js)
- [Plan context](Backend/middlewares/loadPlanContext.js), [feature checks](Backend/middlewares/requireFeature.js), and [plan updates](Backend/services/plan.service.js)
- [Owner settings interface](Frontend/src/pages/OwnerSettings/OwnerSettings.jsx)

## Local setup

Use Node.js 24 for the documented development environment, plus MongoDB and Redis, a Backblaze B2/S3-compatible bucket, and provider credentials for the integrations you configure.

1. Install backend dependencies, copy [Backend/.env.example](Backend/.env.example) to `Backend/.env`, and configure the services used by the API.
2. Install frontend dependencies and configure [Frontend/.env.example](Frontend/.env.example) as `Frontend/.env`.
3. Run the backend and frontend in separate terminals:

```bash
cd Backend
npm install
npm run dev
```

```bash
cd Frontend
npm install
npm run dev
```

For signed CDN delivery, inspect the [Worker package scripts](cloudflare-worker/package.json) and [Worker source](cloudflare-worker/src/worker.js) before configuring your own Cloudflare resources. Local startup is not a production deployment guide.

Keep service credentials in your own environment configuration. Do not commit them.

## Focused backend checks

The repository includes checks for security helpers, email templates, and notification behavior:

```bash
cd Backend
node tests/security.test.js
node tests/email-templates.test.js
node tests/notifications.test.js
```

These commands do not constitute an end-to-end check of uploads, OAuth, transfers, payments, or plan enforcement. No fresh pass count is asserted by this documentation update.

## Current limits

- GitHub operations consume provider API quotas; per-file requests trade atomic batch behavior for a simpler adapter.
- Transfers can fail or be interrupted. A successful copy is not proof of successful source removal or resumable recovery.
- GitHub file editing is not an interactive three-way merge tool.
- Demo availability and source behavior can differ; the observations above are dated rather than a claim about every current deployment.
