# Vault feature guide

[Overview](../README.md) · [Architecture](ARCHITECTURE.md) · [API map](API.md)

Use this page to locate a workflow and understand its evidence boundary. A route or interface in source is not automatically a successful current end-to-end test.

| Area | Implemented surface | Where to inspect |
| --- | --- | --- |
| File storage | Folder hierarchy, direct uploads, previews, download, trash | [File service](../Backend/services/file.service.js), [upload manager](../Frontend/src/hooks/useUploadManager.js) |
| GitHub browser | Repositories, file operations, branches, and transfer handlers | [GitHub service](../Backend/services/github.service.js) |
| Git workspace | Clone-to-Vault representation, working state, staging, Git object commits | [Workspace service](../Backend/services/gitWorkspace.service.js) |
| Drive | OAuth-connected browsing and Vault/provider transfers | [Drive service](../Backend/services/drive.service.js) |
| Media and sharing | Public media, folder manifest, origin policy, player settings | [Sharing service](../Backend/services/share.service.js), [file schema](../Backend/models/fileModel.js) |
| Plans and owner controls | Runtime entitlements, feature gates, owner configuration | [Plan context](../Backend/middlewares/loadPlanContext.js), [owner routes](../Backend/routes/ownerSettingsRoutes.js) |
| Billing | Subscription and provider callback handling | [Subscription routes](../Backend/routes/subscriptionRoutes.js), [webhooks](../Backend/routes/webhookRoutes.js) |

## Recorded evidence

Portfolio checks on 25 October 2026 exercised small multipart uploads and byte-identical signed downloads, Vault↔Drive API copies, and Vault→GitHub transfer/branch/commit/compare operations. Owner/billing interfaces were observed and entitlement paths source-reviewed. The author has since confirmed use by external users; no precise active-user count is asserted.

## Not established by those checks

- Complete move/source-removal or interrupted-transfer recovery across every provider.
- Direct Drive↔GitHub transfers.
- Successful checkout and the full ordinary paid-tier expiry lifecycle.
- Measured throughput, latency, savings, production capacity, or comprehensive security assurance.

The simplified ProCodrr teaching version and this full implementation are related but distinct. Personal implementation scope is described in the [root README](../README.md#what-i-built).
