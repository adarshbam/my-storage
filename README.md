# Vault Cloud Storage & Workspace Platform

A high-performance personal cloud storage platform and developer workspace engine with Direct-to-S3 Multipart Uploads, Cloudflare Edge CDN Caching, and bi-directional Google Drive & GitHub integrations.

---

## 1. The Problem and Intended Users

### The Problem
Traditional personal cloud storage services (like Google Drive or Dropbox) operate as isolated silos separate from developer source control systems like GitHub. Developers and educators frequently need to:
- Move assets and dataset archives between cloud drives and Git repositories without downloading tens of gigabytes to local disk first.
- Manage and inspect repository file trees directly from cloud storage without requiring a full local git CLI environment.
- Stream large files directly to object storage with zero egress bandwidth overhead and without tying up web server memory buffers.

### Intended Users
- **Full-Stack & Systems Developers** who require unified object storage with integrated version control and cloud drive sync.
- **Technical Educators and Content Teams** distributing course assets, source files, and project archives across dual cloud platforms.

---

## 2. What Works Today

- **Direct-to-S3 Chunked Multipart Uploads**: Clients stream large files directly to Backblaze B2 (AWS S3-compatible) using presigned URLs, bypassing application server memory and bandwidth bottlenecks.
- **Zero-Egress Cloudflare Edge CDN**: Custom Cloudflare Worker validates HMAC-SHA256 signatures (`path:v:expires`), checks `caches.default`, and caches streaming byte ranges at edge nodes via the Backblaze Bandwidth Alliance.
- **GitHub Integration & Workspace Engine**:
  - Connects user GitHub accounts via OAuth2 with encrypted access token storage.
  - Programmatic GitHub repository creation directly from the storage dashboard.
  - Repository tree cloning directly into Vault storage folders.
  - In-memory Git blob SHA-1 calculation (`blob <size>\0<content>`).
  - Staging area workbench and atomic multi-file commit generation via GitHub Git Data REST API.
- **Google Drive Integration**:
  - Connects Google Drive via OAuth2 with refresh token rotation.
  - Browses remote Drive hierarchies and streams files directly to and from object storage.
- **Cross-Platform Transfer Engine**:
  - Transfers files directly between Google Drive and GitHub repositories through the platform without requiring local machine disk intermediate storage.
- **Hierarchical Storage Engine**:
  - Nested folder trees with ancestor path arrays (`[rootId, parentId, childId]`) for \(O(1)\) subtree authorization.
  - Multi-document ACID transactions (`withTransaction`) for transactional directory size rollups.
  - Soft-delete trash lifecycles with 30-day scheduled automated purging.
- **Multi-Factor Authentication & Security**:
  - Argon2id password hashing with custom salt rounds.
  - RFC 6238 TOTP (Google Authenticator) with AES-256-GCM encrypted secret keys and 10 hashed one-time backup recovery codes.
  - Phone and email verification via deterministic SHA-256 phone hashing.

---

## 3. My Specific Contribution and Project Origin

### Origin & Foundation
This project originated from the reference cloud storage system designed for the comprehensive **ProCodrr Node.js Backend Course** taught by **Anurag Singh** (`anuragsinghbam`). **Adarsh Singh** contributed to the core course curriculum project as a technical teaching and course development assistant.

### Independent Personal Extensions by Adarsh Singh
Following the core course foundation, Adarsh Singh independently designed, implemented, and extended the platform with the following advanced subsystems:

1. **GitHub Workspace Engine (`Backend/services/github.service.js` - 2,888 LOC)**:
   - Built the entire GitHub integration service from scratch.
   - Implemented in-browser repository creation (`createRepositoryLogic`), remote branch cloning, tree inspection, and directory synchronization into object storage.
   - Authored the in-memory Git blob SHA-1 calculation and multi-file tree commit pipeline invoking GitHub's Git Data API.
2. **Google Drive Integration (`Backend/services/drive.service.js` - 979 LOC)**:
   - Built Google Drive OAuth2 integration with token refresh flows.
   - Developed bi-directional file streaming handlers between Google Drive APIs and S3-compatible object storage buckets.
3. **Cross-Platform Transfer Pipeline**:
   - Engineered the transfer bridge allowing files and directories to move seamlessly between Google Drive and GitHub repositories without local staging.
4. **Enhanced React 19 Frontend**:
   - Built the interactive Git workbench UI components, repository selector modals, and dual-cloud Drive import/export interfaces.

---

## 4. Architecture and Important Decisions Supported by Code

```
                                    ┌────────────────────────────┐
                                    │    React 19 SPA (Vite)     │
                                    │   TailwindCSS / Lucide     │
                                    └──────────────┬─────────────┘
                                                   │
                 ┌─────────────────────────────────┼─────────────────────────────────┐
                 │ 1. Direct Multipart Upload (PUT)│ 2. Signed CDN Stream (GET/Range)│ 3. REST API & Auth (JSON)
                 ▼                                 ▼                                 ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐  ┌───────────────────────────────┐
│     Backblaze B2 (S3 API)     │  │   Cloudflare Edge Worker CDN  │  │   Express.js 5 Backend API    │
│  - Chunked Object Storage     │◄─┤  - HMAC-SHA256 Sig Verify     │  │  - Thin Controllers / Services│
│  - In-memory Part Assembly    │  │  - Edge Cache (caches.default)│  │  - Direct S3 Presigner        │
│  - WebP Thumbnail Storage     │  │  - Bandwidth Alliance (0 Egress) │ - GitHub/Drive Connectors    │
└───────────────────────────────┘  └───────────────────────────────┘  └───────┬───────────────┬───────┘
                                                                              │               │
                                           ┌──────────────────────────────────┘               └──────────────────────────────────┐
                                           ▼                                                                                     ▼
                            ┌───────────────────────────────┐                                                     ┌───────────────────────────────┐
                            │      MongoDB (Mongoose 9)     │                                                     │        Redis In-Memory        │
                            │  - ACID Multi-Doc Transactions│                                                     │  - Distributed Session Cache  │
                            │  - Compound Indexed Schemas   │                                                     │  - Cron Lockouts              │
                            │  - Tree Paths & Rollup Invariants                                                  │  - Cache-Aside Directory Tree │
                            └───────────────────────────────┘                                                     └───────────────────────────────┘
```

### Key Engineering Decisions:
1. **Direct S3 Uploads via Presigned URLs**: Rather than streaming multi-gigabyte uploads through Express server memory (which degrades event loop responsiveness), the backend generates S3 multipart presigned URLs. The browser uploads parts concurrently directly to Backblaze B2.
2. **Edge URL Verification with Web Crypto**: The Cloudflare Edge Worker validates HMAC-SHA256 tokens using the Web Crypto API without contacting the origin database, ensuring sub-50ms cache hits and absolute protection against unauthorized bucket egress.
3. **In-Memory Git Object Tree Construction**: Rather than spawning local `git` CLI binaries on the host system, `github.service.js` interacts directly with GitHub's REST API, constructing git trees and commit blobs in-memory for zero host-disk dependencies.

---

## 5. Setup Instructions and Required Configuration

### Prerequisites
- **Node.js**: `v20.x` or higher
- **MongoDB**: `v6.0+` (Replica set enabled for multi-document transactions)
- **Redis**: `v6.2+`
- **Backblaze B2** bucket (or AWS S3-compatible storage)
- **GitHub OAuth App** & **Google Cloud Console OAuth Credentials**

### Backend Setup
```bash
cd Backend
npm install
cp .env.example .env
```
Start the backend API server:
```bash
npm run dev
# Server listens on http://localhost:4000
```

### Frontend Setup
```bash
cd Frontend
npm install
cp .env.example .env
```
Start the Vite development client:
```bash
npm run dev
# Client listens on http://localhost:5173
```

### Cloudflare Worker Deployment
```bash
cd cloudflare-worker
npm install
npx wrangler secret put CDN_SIGNING_SECRET
npx wrangler secret put B2_APPLICATION_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
npm run deploy
```

### Required Configuration Parameter Names (No Secrets)
| Service | Environment Variable Names |
| :--- | :--- |
| **Backend Core** | `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`, `COOKIE_SECRET`, `JWT_SECRET` |
| **Databases** | `MONGO_URI`, `REDIS_URI` |
| **Object Storage** | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| **Edge CDN** | `CDN_BASE_URL`, `CDN_SIGNING_SECRET` |
| **GitHub OAuth** | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` |
| **Google Drive OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| **Payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| **Frontend** | `VITE_API_BASE_URL` |

---

## 6. Reproducible Example

### Creating a GitHub Repository & Pushing Files via Vault API

```bash
# 1. Create a new GitHub repository directly through Vault
curl -X POST http://localhost:4000/api/v1/github/repos \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<SESSION_COOKIE>" \
  -d '{
    "name": "my-new-vault-sync-repo",
    "description": "Created and synced via Vault Cloud Storage",
    "private": true
  }'

# 2. Transfer a file from Vault Storage to the new GitHub repository
curl -X POST http://localhost:4000/api/v1/github/repos/commit \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<SESSION_COOKIE>" \
  -d '{
    "repo": "my-new-vault-sync-repo",
    "branch": "main",
    "message": "feat: initial commit synced from Vault Storage",
    "files": [
      {
        "vaultFileId": "65b9e0f312c49a001a1b2c3d",
        "targetPath": "docs/architecture.png"
      }
    ]
  }'
```

---

## 7. Tests Actually Run and What They Establish

All automated tests were run on Node.js v24 against the backend test suites:

| Test Suite | File | What It Establishes | Verified Result |
| :--- | :--- | :--- | :--- |
| **Security & Cryptography** | `Backend/tests/security.test.js` | Validates E.164 phone normalization, AES-256-GCM TOTP secret encryption/decryption, OTP hashing, and RFC 6238 TOTP verification. | **18 Passed, 0 Failed** |
| **Email Template Engine** | `Backend/tests/email-templates.test.js` | Validates OTP, password reset, and recovery email HTML formatting, brand headers, and expiry parameters. | **25 Passed, 0 Failed** |
| **Notification Lifecycle & Idempotency** | `Backend/tests/notifications.test.js` | Validates event key deduplication, multi-user authorization isolation, read/dismiss states, and storage quota alert thresholds. | **35 Passed, 0 Failed** |
| **Total Test Assertions** | — | Comprehensive core backend verification | **78 Passed, 0 Failed** |

To execute the test suites:
```bash
cd Backend
node tests/security.test.js
node tests/email-templates.test.js
node tests/notifications.test.js
```

---

## 8. Known Limitations and Roadmap

### Known Limitations
- **GitHub API Rate Limits**: In-memory repository cloning and recursive tree traversals consume GitHub REST API rate limits (5,000 requests/hour for authenticated users); large repositories with thousands of files require batch pagination.
- **Large Dual-Cloud File Transfers**: Streaming very large single files (>100MB) directly between Google Drive and GitHub can experience timeouts on constrained server connections without chunked retry resume logic.
- **Merge Conflict Resolution**: In-browser Git operations support atomic tree commits and branch creation; interactive visual three-way merge conflict resolution is not supported.

### Roadmap
- [ ] **WebAssembly Git Engine**: Integrate `isomorphic-git` inside client web workers for client-side diffing, reducing backend GitHub REST API calls.
- [ ] **Chunked Dual-Cloud Resume**: Implement chunked resumable transfers for Google Drive to S3 and GitHub transfers with Redis-tracked progress states.
- [ ] **Interactive Visual Merge Tool**: Build a side-by-side visual conflict resolution editor in the React workbench for Git branch merges.
- [ ] **Webhook Auto-Sync**: Implement incoming GitHub repository webhook listeners to automatically trigger Vault folder updates when external commits occur.
