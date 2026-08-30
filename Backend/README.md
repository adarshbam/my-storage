# Vault Cloud Storage & Workspace — Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.2.1-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-5.12-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3_/_B2-SDK_v3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Argon2](https://img.shields.io/badge/Security-Argon2-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

<p align="center">
  <strong>Enterprise-grade, distributed REST API backend for Vault Cloud Storage & Git Workspace Platform.</strong><br>
  Orchestrates Direct-to-S3 Multipart Uploads, Cloudflare Edge CDN HMAC verification, Redis distributed locking & cache-aside trees, MongoDB ACID multi-document transactions, dynamic RBAC middleware, and native Git workspace APIs.
</p>

[Architecture](#-system-architecture) • [Key Subsystems](#-key-subsystems--engineering-highlights) • [API Catalog](#-rest-api-catalog) • [Repository Structure](#-repository-structure) • [Getting Started](#-getting-started) • [Deployment](#-production-deployment-guide) • [Interview Talking Points](#-interview-talking-points)

</div>

---

## ⚡ Overview

**Vault Backend** is a stateless, high-concurrency Node.js / Express 5 API service. Designed to avoid the performance and cost pitfalls of routing large binary files through application servers, Vault decouples authentication, metadata management, and business logic from raw object transfer:

- **Zero Server Bandwidth Bottlenecks**: Generates single and multipart presigned S3 URLs so clients upload files (up to 5GB+) directly to Backblaze B2 object storage.
- **Sub-50ms Global Edge Caching**: Generates cryptographic HMAC-SHA256 tokens (`path:v:expires`) that Cloudflare Edge Workers verify to serve cached media directly from edge nodes with zero egress fees (Bandwidth Alliance).
- **In-Memory Git Engine**: Clones GitHub repositories into object storage, computes Git blob SHAs, tracks working directory diffs, and pushes atomic multi-file commit trees directly via the GitHub REST API.
- **ACID Transactional Consistency**: Maintains folder hierarchies, path ancestors (`[rootId, parentId, childId]`), and storage size rollups using MongoDB multi-document transactions and weekly reconciliation jobs.

---

## 🏛️ System Architecture

```
                               ┌────────────────────────────┐
                               │    React 19 Frontend SPA   │
                               └──────────────┬─────────────┘
                                              │
                 ┌────────────────────────────┼────────────────────────────┐
                 │ 1. Request Presigned Upload│ 2. Authenticated REST API  │ 3. HMAC Stream Token Request
                 ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Express 5 REST API Backend                               │
│  - Helmet 8 Security Headers & Strict CSP    - Dynamic RBAC Plan Context Middleware     │
│  - Distributed Redis Rate Limiters           - Argon2 Password & RFC 6238 TOTP Engine   │
│  - Presigned S3 Multipart Orchestrator       - Razorpay Webhook Event Dispatcher        │
└──────────────┬──────────────────────────────┬──────────────────────────────┬───────────┘
               │                              │                              │
               ▼                              ▼                              ▼
┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐
│     MongoDB (Mongoose 9)     ││       Redis In-Memory        ││    Backblaze B2 (AWS S3)     │
│ - ACID Multi-Doc Transactions││ - Cache-Aside Directory Tree ││ - Chunked Object Storage     │
│ - Compound Indexed Schemas   ││ - Distributed Session Cache  ││ - Presigned Upload Chunks    │
│ - Path Arrays & Rollup Trees ││ - Distributed Cron Lockouts  ││ - Zero Node.js I/O Buffer    │
└──────────────────────────────┘└──────────────────────────────┘└──────────────────────────────┘
```

---

## 🌟 Key Subsystems & Engineering Highlights

| Subsystem | Architecture & Implementation | Engineering Benefit |
| :--- | :--- | :--- |
| **Decoupled S3 Multipart Uploads** | Express generates presigned single & multipart URLs (`@aws-sdk/client-s3`). Client uploads directly to Backblaze B2; backend completes multipart assembly. | **Zero server memory or network load** during uploads; prevents socket exhaustion and supports large multi-gigabyte files. |
| **Edge CDN HMAC Token Validation** | Backend generates signed HMAC-SHA256 tokens (`crypto`); Cloudflare Edge Worker verifies signature and serves cached byte ranges from `caches.default`. | Sub-50ms edge delivery for video/audio streaming with **zero egress bandwidth fees** via Cloudflare & Backblaze Bandwidth Alliance. |
| **In-Memory Git Workspace Engine** | Fetches GitHub tree objects, calculates Git blob SHAs (`blob <size>\0<content>`), provides a staging workbench, and constructs atomic commit trees via GitHub REST API. | Transforms object storage into an interactive code browser and Git workspace without requiring local `git` CLI binaries. |
| **Cache-Aside Redis Layer** | Caches directory listings (`dir:contents:<id>`), directory metadata (`dir:meta:<id>`), and active user session sets. Mutations invalidate cache keys atomically. | **Sub-millisecond directory responses**; eliminates expensive recursive aggregation queries on deeply nested hierarchies. |
| **Transactional Folder Rollups** | Directory size calculations and path ancestors are maintained through atomic MongoDB transactions (`withTransaction`) and weekly cron reconciliations. | Consistent folder sizes across deeply nested hierarchies without full-tree re-scans on every read. |
| **Defense-in-Depth Security & 2FA** | Argon2 password hashing, RFC 6238 TOTP (Google Authenticator), hashed recovery codes, phone/SMS OTP verification, and signed `HttpOnly` cookies. | Enterprise-grade credential protection, immune to rainbow table attacks and session hijacking. |
| **Dynamic RBAC & Plan Engine** | Multi-tier configuration (Free, Novice, Pro, Master, Ultimate) dynamically injected via `loadPlanContext` middleware. | Declarative enforcement of feature flags, upload quotas, device limits, and permissions at the routing layer. |
| **Automated Garbage Collection** | Cron scheduler protected by distributed Redis locks performs daily 30-day trash purges, 60-day inactive account asset purges, and orphan S3 version cleanup. | Zero storage leaks, guaranteed disk reclamation, and fault-tolerant background execution across clustered instances. |

---

## 📡 REST API Catalog

Vault Backend exposes a clean, modular RESTful API:

### Authentication & Security (`/api/auth`, `/api/2fa`, `/api/otp`)
- `POST /api/auth/register` — Create user account with Argon2 password hashing
- `POST /api/auth/login` — Authenticate user and issue signed session cookie
- `POST /api/auth/logout` — Clear session cookie and invalidate Redis session entry
- `GET /api/auth/google/callback` — Google OAuth 2.0 exchange and authentication
- `GET /api/auth/github/callback` — GitHub OAuth exchange and token management
- `POST /api/2fa/generate` — Generate RFC 6238 TOTP secret and QR code data URL
- `POST /api/2fa/verify` — Verify TOTP code and activate 2FA with recovery codes
- `POST /api/phone-verification/send` — Dispatch SMS verification OTP via Firebase/Twilio

### Drive & File Management (`/api/drive`, `/api/files`, `/api/directories`)
- `GET /api/drive/contents` — Fetch directory tree with Redis cache-aside acceleration
- `POST /api/directories/create` — Create nested directory within transactional path hierarchy
- `POST /api/files/presigned-upload` — Generate presigned S3 single-part upload URL
- `POST /api/files/multipart/initiate` — Initialize direct S3 multipart upload session
- `POST /api/files/multipart/chunk-url` — Generate presigned URL for specific chunk part
- `POST /api/files/multipart/complete` — Finalize multipart assembly on S3 and record metadata
- `GET /api/files/:id/stream-token` — Generate HMAC-SHA256 CDN stream token for edge playback
- `DELETE /api/files/:id` — Soft-delete file to trash with 30-day retention lifecycle

### Git Workspace Engine (`/api/git`, `/api/github`)
- `POST /api/git/clone` — Clone GitHub repository tree into object storage hierarchy
- `GET /api/git/branches` — List remote branches for a repository
- `GET /api/git/tree` — Fetch file tree structure for active branch
- `POST /api/git/stage` — Stage modified or new file blobs
- `POST /api/git/commit` — Construct atomic multi-file Git tree and commit to GitHub

### Billing & Webhooks (`/api/billing`, `/api/plans`, `/api/webhooks`)
- `GET /api/plans` — Retrieve active plan tiers, feature flags, and storage limits
- `POST /api/billing/create-order` — Initialize Razorpay subscription order
- `POST /api/billing/verify` — Verify Razorpay payment signature and upgrade user tier
- `POST /api/webhooks/razorpay` — Modular webhook dispatcher for payment and subscription events

---

## 📁 Repository Structure

```text
Backend/
├── config/                            # Global configuration & environment constants
│   └── config.js                      # Environment loader, default ports, timeouts, CORS
│
├── constants/                         # Application static constants
│   ├── notificationConstants.js       # System notification types and message templates
│   └── planConstants.js               # Default tier definitions (Free, Novice, Pro, Master, Ultimate)
│
├── controllers/                       # Thin HTTP request & response handlers
│   ├── authController.js              # User registration, login, logout, password reset
│   ├── directoryController.js         # Folder CRUD, tree traversal, path updates
│   ├── driveController.js             # Root drive metadata, aggregate storage statistics
│   ├── fileController.js              # Presigned upload URLs, download tokens, file deletion
│   ├── gitWorkspaceController.js      # Git repository cloning, branch switching, file editing
│   ├── githubController.js            # GitHub OAuth token exchange & REST API client
│   ├── billingController.js           # Razorpay order generation & subscription management
│   ├── shareController.js             # Cryptographic public share link generation & access
│   └── trashController.js             # Soft delete restoration & manual purge operations
│
├── databases/                         # Database and Cache connection singletons
│   ├── mongoose.js                    # MongoDB connection with automatic replica set reconnect
│   └── redis.js                       # Redis v5 client connection with reconnection strategy
│
├── errors/                            # Standardized error handling architecture
│   └── AppError.js                    # Custom operational AppError with HTTP status codes
│
├── integrations/                      # Isolated third-party infrastructure clients
│   ├── email/                         # Nodemailer SMTP email dispatcher
│   ├── firebase/                      # Firebase Admin SDK for Phone Verification / SMS
│   ├── razorpay/                      # Razorpay client instance
│   └── sms/                           # SMS delivery fallback service
│
├── jobs/                              # Scheduled background cron maintenance jobs
│   └── cleanup.job.js                 # 30-day trash purger, orphan multipart cleaner, Redis locks
│
├── middlewares/                       # Express middleware pipeline
│   ├── authMiddleware.js              # Signed cookie session verification & user attachment
│   ├── loadPlanContext.js             # Dynamic plan tier, storage quota & feature flag injector
│   ├── rateLimiter.js                 # Distributed Redis-backed rate limiters by route category
│   ├── uploadLimits.js                # Quota enforcement middleware before upload URL generation
│   └── validateRequest.js             # Generic Zod validation middleware wrapper
│
├── models/                            # 20 Mongoose Schemas with Compound Indexes
│   ├── User.js                        # User profile, credentials, 2FA secrets, plan reference
│   ├── File.js                        # File metadata, S3 object keys, size, MIME type, trash state
│   ├── Directory.js                   # Folder hierarchy, parentId, path ancestors, size rollups
│   ├── GitWorkspace.js                # Connected GitHub repos, branches, and staging state
│   ├── DeviceSession.js               # Active browser sessions, IP, user-agent, last seen
│   ├── Plan.js                        # System plan tier configurations and limits
│   └── Subscription.js                # Razorpay subscription records and billing cycles
│
├── routes/                            # Modular Express router definitions (21 route files)
├── services/                          # Domain business logic & transaction boundaries
│   ├── auth.service.js                # Authentication, password hashing, 2FA workflows
│   ├── file.service.js                # S3 presigned URL generation, multipart orchestrator
│   ├── directory.service.js           # ACID folder operations, recursive size recalculation
│   ├── gitWorkspace.service.js        # Git blob SHA computation, tree generation, commit dispatch
│   └── s3.js                          # AWS SDK S3 client wrapper and presigner helpers
│
├── utils/                             # Security helpers, path sanitizers, token generators
│   └── cdnToken.js                    # HMAC-SHA256 URL token generator for Cloudflare Worker
│
├── validators/                        # Zod schema input validation rules
├── webhooks/                          # Razorpay webhook event handlers with idempotency
├── workers/                           # CPU-bound background workers (Sharp WebP / FFmpeg)
├── app.js                             # Express application bootstrap & security middleware
├── package.json                       # Dependencies & script definitions
└── .env.example                       # Documented environment variable template
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **MongoDB**: `v6.0+` with **Replica Set** enabled (`rs0` or MongoDB Atlas cluster for ACID transactions)
- **Redis**: `v6.2+` (local or Redis Cloud instance)
- **Backblaze B2 / AWS S3** bucket & credentials
- **Cloudflare Account** (for Edge CDN worker)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/adarshbam/my-storage-backend.git
cd my-storage-backend

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment template and configure your values:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP server port | `4000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `CLIENT_URL` | Frontend URL for CORS and cookies | `http://localhost:5173` |
| `DB_URL` | MongoDB connection string (**Replica Set required**) | `mongodb://localhost:27017/vault_storage?replicaSet=rs0` |
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379` |
| `SESSION_SECRET` | Secret string for signed cookies | `your_secret_key_min_32_chars` |
| `BACKBLAZE_*` | Backblaze B2 S3 API credentials & bucket | Endpoint, Region, Key, Secret |
| `CLOUDFLARE_CDN_*` | Cloudflare Worker domain & shared HMAC secret | CDN Domain & HMAC Secret |
| `RAZORPAY_*` | Razorpay API keys & Webhook secret | `rzp_test_...` |
| `GOOGLE_*` / `GITHUB_*` | OAuth provider credentials | Client ID & Client Secret |

### 3. Running Locally

```bash
# Start backend in development mode with nodemon
npm run dev

# Start backend in standard production mode
npm start
```

The API server will listen on `http://localhost:4000`.

---

## 🌐 Production Deployment Guide

### Deploying to Cloud Platforms (Render, Railway, Fly.io)

1. Connect your GitHub repository to **Render** or **Railway**.
2. Set Environment Type to **Node.js**.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Configure Environment Variables matching `.env.example`:
   - `DB_URL`: Use a managed MongoDB instance with replica set enabled (such as **MongoDB Atlas M0/M10+**).
   - `REDIS_URL`: Use a managed Redis instance (such as **Redis Cloud** or **Upstash**).
   - Set `NODE_ENV=production` and your production `CLIENT_URL` (e.g., `https://vault.yourdomain.com`).

### Deploying to an Ubuntu VPS / AWS EC2 with PM2 & Nginx

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start the application with PM2 clustering
pm2 start app.js --name "vault-backend" -i max --env production

# 3. Save PM2 startup script
pm2 save
pm2 startup
```

Configure Nginx as a reverse proxy with SSL termination (`certbot`):

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🎯 Interview Talking Points

If discussing this backend architecture during a software engineering or system design interview:

1. **Decoupled Direct-to-S3 Upload Flow**:
   - *Architecture*: Explain why traditional multi-gigabyte uploads overload Node.js event loops and memory buffers. In Vault, the backend acts purely as an authorization and presigned URL token dispenser. The client streams parts directly to S3/B2, eliminating server bandwidth and CPU bottlenecks.

2. **Edge CDN Validation via Bandwidth Alliance**:
   - *Architecture*: How media streaming requests generate time-limited HMAC-SHA256 signatures (`path:v:expires`). The Cloudflare Worker validates the signature at the edge via Web Crypto, serving cache hits from `caches.default` and fetching cache misses from Backblaze B2 with **zero egress costs**.

3. **In-Memory Git Engine without Local Binaries**:
   - *Architecture*: How Vault models Git repositories within MongoDB and S3 by computing Git blob SHAs (`blob <size>\0<content>`), providing a staging workbench, and constructing atomic commit trees directly via the GitHub REST API.

4. **Distributed Redis Caching & Lockouts**:
   - *Architecture*: High-throughput cache-aside pattern for folder navigation (`dir:contents:<id>`) with automated invalidation on mutations. Scheduled cron jobs leverage Redis distributed lockout keys to prevent duplicate execution across clustered backend nodes.

5. **ACID Multi-Document Transactions & Path Invariants**:
   - *Architecture*: How folder tree operations (moving folders, deleting deep trees, rolling up folder sizes) execute inside MongoDB transactions (`withTransaction`), ensuring database invariants and preventing orphan file states.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
