# Vault API map

[Overview](../README.md) · [Architecture](ARCHITECTURE.md) · [Security](SECURITY.md)

The authoritative route mounts are in [Backend/app.js](../Backend/app.js). The API does **not** apply a general `/api/v1` prefix. Combine a mount below with the relative path in its router. A reverse proxy can add deployment-specific behavior outside these definitions.

## Router groups

| Mount | Responsibility | Exact routes |
| --- | --- | --- |
| `/user` | Accounts and sessions | [userRoutes.js](../Backend/routes/userRoutes.js) |
| `/user/2fa`, `/user/phone` | TOTP and phone verification | [twoFactorRoutes.js](../Backend/routes/twoFactorRoutes.js), [phoneVerificationRoutes.js](../Backend/routes/phoneVerificationRoutes.js) |
| `/directory`, `/file`, `/trash` | File/folder operations | [directoryRoutes.js](../Backend/routes/directoryRoutes.js), [fileRoutes.js](../Backend/routes/fileRoutes.js), [trashRoutes.js](../Backend/routes/trashRoutes.js) |
| `/github` | Connected repository operations | [githubRoutes.js](../Backend/routes/githubRoutes.js) |
| `/git-workspace` | Vault-backed Git working state | [gitWorkspaceRoutes.js](../Backend/routes/gitWorkspaceRoutes.js) |
| `/drive` | Drive browsing and transfers | [driveRoutes.js](../Backend/routes/driveRoutes.js) |
| `/share` | Links, public media, and folder manifests | [shareRoutes.js](../Backend/routes/shareRoutes.js) |
| `/plan`, `/plans`, `/subscriptions`, `/billing` | Plans and billing | [planRoutes.js](../Backend/routes/planRoutes.js), [subscriptionRoutes.js](../Backend/routes/subscriptionRoutes.js), [billingRoutes.js](../Backend/routes/billingRoutes.js) |
| `/owner-settings`, `/users`, `/system-config` | Owner/account administration | [ownerSettingsRoutes.js](../Backend/routes/ownerSettingsRoutes.js), [systemUsersRoutes.js](../Backend/routes/systemUsersRoutes.js), [systemConfigRoutes.js](../Backend/routes/systemConfigRoutes.js) |
| `/webhooks`, `/notifications` | Provider callbacks and notifications | [webhookRoutes.js](../Backend/routes/webhookRoutes.js), [notificationRoutes.js](../Backend/routes/notificationRoutes.js) |

## Representative contracts

| Method and path | Purpose |
| --- | --- |
| `POST /file/upload-vault/multipart/initiate` | Begin a multipart upload after upload/plan checks |
| `POST /file/upload-vault/multipart/part-url` | Request a signed part URL |
| `POST /file/upload-vault/multipart/complete` | Finalize using uploaded part identifiers/ETags |
| `POST /file/upload-vault/multipart/abort` | Abort the tracked upload |
| `POST /git-workspace/clone` | Represent a repository as a Vault workspace |
| `GET /git-workspace/status` | Read working/staged state |
| `POST /git-workspace/stage` | Stage workspace changes |
| `POST /git-workspace/commit` | Build Git objects and update a branch ref |
| `GET /share/public-folder/:token/manifest` | Read a public folder's playback manifest |

These are route summaries, not copy-and-paste request recipes. Use the corresponding router's imported [validators](../Backend/validators/) and controller/service for required bodies, query parameters, authorization, and response shapes. IDs and signed tokens must come from your own session; none are supplied here.

## Request policy

Authenticated file routes use session checks. Connected workspace routes add plan/feature gates; upload routes apply upload limits. Sharing has both authenticated management and token-based public routes. Rate limits and validation differ by endpoint; one successful route does not establish access to another.

Do not treat a frontend-hidden control, an HTTP 200 alone, or a payment redirect as proof of authorization, successful byte transfer, or verified payment state. Error/status behavior belongs to each handler and can change independently of this map.
