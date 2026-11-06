# Vault security boundaries

[Overview](../README.md) · [Architecture](ARCHITECTURE.md) · [API map](API.md)

This page maps controls and operational responsibilities in source. It is not a penetration-test report, a compliance certification, or a guarantee against compromise.

## Control map

| Boundary | Implementation and review point |
| --- | --- |
| Account/session access | [User routes](../Backend/routes/userRoutes.js), [session model](../Backend/models/sessionModel.js), [middleware](../Backend/middlewares/) |
| TOTP and recovery | [Two-factor routes](../Backend/routes/twoFactorRoutes.js) and their controller/service imports |
| Object and folder permissions | File/directory services and their route-specific authorization |
| Plan/feature access | [loadPlanContext.js](../Backend/middlewares/loadPlanContext.js), [requireFeature.js](../Backend/middlewares/requireFeature.js) |
| Signed file delivery | [Backend signer](../Backend/integrations/cdn/cloudflare.service.js), [Worker verification](../cloudflare-worker/src/worker.js) |
| Public shares and embeds | [Sharing service](../Backend/services/share.service.js), file/folder public-access policy |
| Request limits, headers, and origins | [app.js](../Backend/app.js) and middleware attached to each router |

## Configuration is part of the boundary

Set explicit session, signing, OAuth, provider, and demonstration-account values for your environment. The repository contains fallback development/demo configuration; do not assume defaults are appropriate for deployment. Review cookie `Secure`, `HttpOnly`, `SameSite`, signing, HTTPS termination, and trusted origins together rather than inferring them from a screenshot or README badge.

Backend secrets stay on the service/Worker side. `VITE_*` values are public client configuration. Keep `.env`, `.dev.vars`, provider tokens, signing keys, session cookies, and private account data outside published documentation.

## Signed delivery and public media

Ordinary signed reads validate path/version/expiry before Worker cache access. Public media uses its own signed payload and allowed-origin checks. Neither mechanism prevents an authorized client from retaining or redistributing bytes. Origin/Referer restrictions are not DRM or proof against arbitrary non-browser clients.

A signed link expiring does not revoke content already in browser caches or saved locally. Worker caches, browser freshness, public tokens, and changing share settings need a coherent lifecycle. Examine deployed behavior before claiming immediate revocation.

## Important limits

- No zero-knowledge/client-side encryption or absolute privacy guarantee is established by the reviewed flow.
- Input validation, rate limits, and TOTP are specific controls, not proof that every route is secure.
- MongoDB transactions do not cover B2, Redis, GitHub, Drive, or payment-provider operations as one transaction.
- OAuth access, public-share scope, subscription enforcement, logging, and administrative permissions need independent verification.
- Source configuration is not proof of the deployed revision, cookie/header policy, provider bucket settings, or backup/recovery posture.

Avoid including exploit details, private files, or account credentials in public issue reports. Use an established private owner contact for sensitive reports; this repository does not claim a formal disclosure program.
