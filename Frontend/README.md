# Vault web workspace

React/Vite interface for files, GitHub, Google Drive, media sharing, and owner controls.

[Application overview](../README.md) · [Architecture](../docs/ARCHITECTURE.md) · [API map](../docs/API.md)

## Main flows

- Folder navigation, selection, previews, uploads, downloads, and trash.
- GitHub repository browsing and a separate staging/commit workspace.
- Drive browsing and provider transfers.
- Public media/share controls, subscription views, and owner settings.

## Run locally

Use Node.js 24 and a configured Vault API. Copy [.env.example](.env.example) to `.env` and set the frontend's public configuration for your environment. Every `VITE_*` value is bundled into client code; backend credentials do not belong there.

```sh
npm install
npm run dev
```

Vite normally serves port `5173`. Match the API origin and OAuth callback configuration to the backend.

```sh
npm run lint
npm run build
npm run preview
```

The current `npm test` script invokes `dummyTest.js`; it is a placeholder, not a product regression suite. Build/lint success alone would not prove OAuth, transfers, media playback, or plan enforcement.

## Source map

| Responsibility | Location |
| --- | --- |
| Application routes | [src/App.jsx](src/App.jsx) |
| Provider and API calls | [src/api/](src/api/) |
| Upload coordination | [src/hooks/useUploadManager.js](src/hooks/useUploadManager.js) |
| Connected workspaces | [src/components/chambers/](src/components/chambers/) |
| Git workspace controls | [src/components/git/](src/components/git/) |
| Owner controls | [src/pages/OwnerSettings/](src/pages/OwnerSettings/) |

The browser sends authorization/control requests to the API and upload parts directly to B2. Signed reads use the Worker delivery path when configured. UI visibility is not authorization; backend checks remain authoritative.

## Hosting

The repository includes an [S3/CloudFront workflow](../.github/workflows/frontend-deploy.yml), [Dockerfile](Dockerfile), and [Nginx config](nginx.conf). Review environment and SPA fallback settings before using any target. These files describe available tooling; they do not certify the deployed topology or performance.
