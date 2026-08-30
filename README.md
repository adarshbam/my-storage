# Vault Cloud Storage & Workspace Platform

<div align="center">

![React](https://img.shields.io/badge/Frontend-React_19_%7C_Vite_7_%7C_Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Express_5_%7C_Node.js_20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Cache-Redis_5.12-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Object Storage](https://img.shields.io/badge/Storage-Backblaze_B2_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Edge CDN](https://img.shields.io/badge/CDN-Cloudflare_Worker-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

<p align="center">
  <strong>High-performance, secure personal cloud storage engine and developer workspace.</strong><br>
  Engineered with a stateless decoupled architecture featuring Direct-to-S3 Multipart Uploads, Cloudflare Edge CDN Caching via Bandwidth Alliance, Distributed Redis Sessions & Locks, Multi-Factor Authentication (TOTP + SMS/Email), and Native In-Memory Git Workspaces.
</p>

### 📦 Standalone Repositories

| Subsystem | Standalone Repository | Purpose | Primary Tech Stack |
| :--- | :--- | :--- | :--- |
| 🎨 **Frontend Client** | [**`my-storage-frontend`**](https://github.com/adarshbam/my-storage-frontend) | SPA UI, Direct-to-S3 Uploader, Git Workbench | React 19, Vite 7, TailwindCSS 3, Framer Motion |
| ⚙️ **Backend API** | [**`my-storage-backend`**](https://github.com/adarshbam/my-storage-backend) | REST API, S3 Presigner, Auth & RBAC, Redis | Node.js 20, Express 5, Mongoose 9, Redis 5 |
| ⚡ **Edge Gateway** | [**`cloudflare-worker/`**](cloudflare-worker/) | HMAC Signature Validation, 0-Egress CDN | Cloudflare Workers, Web Crypto, B2 Bandwidth Alliance |

[Key Capabilities](#-key-capabilities--technical-highlights) • [Architecture](#-system-architecture) • [Directory Structure](#-repository-structure) • [Getting Started](#-getting-started) • [Deep-Dive Docs](#-detailed-engineering-documentation) • [Interview Talking Points](#-interview-talking-points)

</div>

---

## ⚡ Overview

**Vault Storage** is a full-stack personal cloud drive and developer workspace engineered with a stateless, decoupled architecture. Instead of routing multi-gigabyte file streams through monolithic backend web servers, Vault orchestrates direct client-to-object-storage transfers using S3 presigned URLs, Cloudflare Edge Workers with HMAC-SHA256 URL validation for egress-free CDN caching, and asynchronous libuv worker threads for zero-disk-I/O WebP thumbnail generation.

Beyond standard cloud drive capabilities (hierarchical folder navigation, tree-traversal size rollups, soft delete trash lifecycles, and cryptographic link sharing), Vault integrates a full Git workspace engine that allows cloning GitHub repositories directly into object storage, computing Git blob SHAs in-memory, managing branches, staging workbenches, and committing atomic multi-file trees directly to GitHub via the REST API.

---

## 🏛️ System Architecture

```
                                    ┌────────────────────────────┐
                                    │    React 19 SPA (Vite)     │
                                    │  TailwindCSS / Radix UI    │
                                    └──────────────┬─────────────┘
                                                   │
                 ┌─────────────────────────────────┼─────────────────────────────────┐
                 │ 1. Direct Multipart Upload (PUT)│ 2. Signed CDN Stream (GET/Range)│ 3. REST API & Auth (JSON)
                 ▼                                 ▼                                 ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐  ┌───────────────────────────────┐
│     Backblaze B2 (S3 API)     │  │   Cloudflare Edge Worker CDN  │  │   Express.js 5 Backend API    │
│  - Chunked Object Storage     │◄─┤  - HMAC-SHA256 Sig Verify     │  │  - Thin Controllers / Services│
│  - In-memory Part Assembly    │  │  - Edge Cache (caches.default)│  │  - Helmet Strict CSP / HSTS   │
│  - WebP Thumbnail Bucket      │  │  - Bandwidth Alliance (0 Egress) │ - Distributed Rate Limiters   │
└───────────────────────────────┘  └───────────────────────────────┘  └───────┬───────────────┬───────┘
                                                                              │               │
                                           ┌──────────────────────────────────┘               └──────────────────────────────────┐
                                           ▼                                                                                     ▼
                            ┌───────────────────────────────┐                                                     ┌───────────────────────────────┐
                            │      MongoDB (Mongoose 9)     │                                                     │        Redis In-Memory        │
                            │  - ACID Multi-Doc Transactions│                                                     │  - Distributed Session Cache  │
                            │  - Compound Indexed Schemas   │                                                     │  - Cron Lockouts (Redlock-like)│
                            │  - Tree Paths & Rollup Invariants                                                  │  - Cache-Aside Directory Tree │
                            └───────────────────────────────┘                                                     └───────────────────────────────┘
```

---

## 🌟 Key Capabilities & Technical Highlights

| Subsystem | Architecture & Implementation | Engineering Benefit |
| :--- | :--- | :--- |
| **Direct S3 / Multipart Uploads** | Client initiates upload with backend; backend returns presigned single or multipart URLs. Client uploads chunks directly to Backblaze B2. | **Zero server bandwidth bottlenecks**; supports files up to plan limits (e.g. 5GB+) with pause/resume and concurrency control. |
| **Cloudflare Edge CDN Gateway** | Custom Cloudflare Worker verifies HMAC-SHA256 signatures (`path:v:expires`), checks `caches.default`, and proxies B2 via the Bandwidth Alliance. | **Sub-50ms edge delivery**, byte-range streaming for video/audio, and **zero egress bandwidth fees**. |
| **Git Workspace Engine** | Clones repositories into storage folders, calculates Git blob SHAs (`blob <size>\0<content>`), provides a staging workbench, and pushes multi-file commits atomically. | Turns object storage into an interactive code browser and Git workspace without requiring local `git` CLI binaries. |
| **High-Performance Caching** | Cache-aside Redis layer for directory listings (`dir:contents:<id>`), metadata counters (`dir:meta:<id>`), and active user session sets. | **Sub-millisecond directory responses**, eliminates repeated aggregation queries on large folder hierarchies. |
| **Transactional Folder Rollups** | Directory size calculations and path ancestors are maintained through atomic MongoDB transactions (`withTransaction`) and weekly cron reconciliations. | Consistent folder sizes across deeply nested hierarchies without full-tree re-scans on every read. |
| **Multi-Tier Security & 2FA** | Argon2 password hashing, RFC 6238 TOTP (Google Authenticator), hashed recovery codes, phone/email OTP verification, and strict signed cookies. | Enterprise-grade credential protection, immune to rainbow table attacks and session hijacking. |
| **Dynamic RBAC & Plan Engine** | Multi-tier configuration (Free Trial, Novice, Pro, Master, Ultimate) dynamically injected via Express middleware (`loadPlanContext`). | Feature flags, upload limits, and permissions enforced declaratively at the routing layer. |
| **Automated Garbage Collection** | Cron scheduler protected by distributed Redis locks performs daily 30-day trash purges, 60-day inactive account asset purges, and orphan S3 version cleanup. | Zero disk leaks, guaranteed storage reclamation, and fault-tolerant background execution across clustered nodes. |

---

## 🛠️ Technology Stack

### **Backend Core**
- **Runtime & Framework**: [Node.js](https://nodejs.org/) (ES Modules) with [Express.js 5](https://expressjs.com/)
- **Database & ODM**: [MongoDB](https://www.mongodb.com/) via [Mongoose 9](https://mongoosejs.com/) (ACID Transactions, Compound Indexes)
- **Caching & Locking**: [Redis 5](https://redis.io/) (`rate-limit-redis`, session sets, cache-aside keys)
- **Object Storage**: [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- **Edge CDN**: [Cloudflare Workers](https://workers.cloudflare.com/) (Web Crypto HMAC SHA-256, Cache API)
- **Authentication & Cryptography**: [Argon2](https://github.com/ranisalt/node-argon2), [OTPLib](https://github.com/yeojinj/otplib), `crypto`, `cookie-parser`
- **Media Processing**: [Sharp](https://sharp.pixelplumbing.com/) (libuv C++ thread pool), [Fluent-FFmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- **Validation & Security**: [Zod 4](https://zod.dev/), [Helmet 8](https://helmetjs.github.io/) (Strict CSP, HSTS, CORP, COOP), [Express-Rate-Limit 8](https://express-rate-limit.mintlify.app/)
- **Billing & Subscriptions**: [Razorpay SDK](https://razorpay.com/docs/api/) & Custom Modular Webhook Dispatcher
- **External Integrations**: [Google APIs](https://github.com/googleapis/google-api-nodejs-client) (Drive v3 OAuth2), [GitHub REST API](https://docs.github.com/en/rest)

### **Frontend Core**
- **Framework & Build**: [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/) (Data routes, Protected & Public guards)
- **Styling & UI**: [TailwindCSS 3](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Framer Motion 12](https://www.framer.com/motion/)
- **File System Integration**: Native Web [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (`showSaveFilePicker`, `WritableStream`)
- **Code & Syntax**: `react-simple-code-editor`, `react-syntax-highlighter`, `prismjs`

---

## 📁 Repository Structure

```text
my-storage/
├── Backend/                         # Express.js 5 REST API & Business Logic
│   ├── app.js                       # Express app bootstrap & security headers
│   ├── config/                      # Environment configuration & static parameters
│   ├── constants/                   # Notification & plan constants
│   ├── controllers/                 # Thin HTTP request/response handlers
│   ├── databases/                   # Mongoose (MongoDB) & Redis connection clients
│   ├── errors/                      # Standardized AppError definitions
│   ├── integrations/                # Isolated infrastructure wrappers (S3, CDN, Razorpay, Email, SMS)
│   ├── jobs/                        # Cron jobs (storage cleanup, OTP GC, integrity reconcile)
│   ├── middlewares/                 # Auth, RateLimiting, PlanContext, UploadLimits
│   ├── models/                      # 20 Mongoose schemas & compound indexes
│   ├── routes/                      # Express route declarations (21 route modules)
│   ├── services/                    # Domain business logic & transaction boundaries
│   ├── utils/                       # Security helpers, sanitizers, path resolvers
│   ├── validators/                  # Zod input validation schemas
│   ├── webhooks/                    # Razorpay webhook event dispatcher & handlers
│   └── workers/                     # CPU-bound thumbnail processing (Sharp / FFmpeg)
│
├── Frontend/                        # React 19 Single Page Application
│   ├── src/
│   │   ├── api/                     # Centralized API service client layer
│   │   ├── components/              # Modular UI components (Drive, Git, Auth, Billing)
│   │   ├── context/                 # React Contexts (Auth, Plan, Guide, Shortcuts)
│   │   ├── hooks/                   # Custom Hooks (UploadManager, DownloadManager, SelectionBox)
│   │   ├── layouts/                 # DashboardLayout, StandaloneLayout, AuthLayout
│   │   ├── lib/                     # Client utilities, API fetch wrapper, currency helpers
│   │   ├── pages/                   # Application views (FileBrowser, OwnerSettings, Profile, etc.)
│   │   └── App.jsx                  # Main route hierarchy & theme provider
│   ├── vercel.json                  # Vercel SPA rewrite rules
│   ├── vite.config.js               # Vite build configuration
│   └── tailwind.config.js           # Tailwind design tokens & dark mode styling
│
├── cloudflare-worker/               # Cloudflare Edge Gateway Worker
│   ├── src/
│   │   └── worker.js                # HMAC validation, Edge Caching, B2 Bandwidth Alliance proxy
│   └── wrangler.toml                # Cloudflare Worker deployment configuration
│
└── docs/                            # In-Depth Engineering Documentation Suite
    ├── ARCHITECTURE.md              # Deep-dive system architecture & sequence flows
    ├── FEATURES.md                  # Comprehensive feature inventory & implementation status
    ├── API.md                       # Complete REST API specification
    ├── DATA-MODEL.md                # Schema definitions, ER diagrams & database indexes
    └── SECURITY.md                  # Security mechanisms, auth flows & audit review
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **MongoDB**: `v6.0+` (Replica set enabled for multi-document ACID transactions, e.g. `rs0` or MongoDB Atlas)
- **Redis**: `v6.2+`
- **Backblaze B2** account & bucket (or AWS S3 compatible object storage)
- **Cloudflare Account** (for Edge CDN Worker deployment)

### 1. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Start the backend development server:
```bash
npm run dev
```
The server starts on `http://localhost:4000`.

### 2. Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env
```

Start the Vite development server:
```bash
npm run dev
```
The client starts on `http://localhost:5173`.

### 3. Cloudflare Worker Deployment

```bash
cd cloudflare-worker
npm install
npx wrangler secret put CDN_SIGNING_SECRET
npx wrangler secret put B2_APPLICATION_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
npm run deploy
```

---

## 🧪 Detailed Engineering Documentation

For a comprehensive review of the engineering decisions, API contracts, database modeling, and security design:

* 📖 **[System Architecture (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)**: Deep dive into component architecture, sequence flows, multipart upload state machines, and Edge CDN integration.
* 📦 **[Feature Inventory (`docs/FEATURES.md`)](docs/FEATURES.md)**: Code-verified inventory of all implemented subsystems and capabilities.
* 📡 **[REST API Reference (`docs/API.md`)](docs/API.md)**: Exhaustive endpoint documentation with headers, request/response bodies, and HTTP status codes.
* 🗄️ **[Data Model (`docs/DATA-MODEL.md`)](docs/DATA-MODEL.md)**: 20 Mongoose schemas, compound indexes, cascades, and storage invariants.
* 🛡️ **[Security Architecture (`docs/SECURITY.md`)](docs/SECURITY.md)**: In-depth analysis of authentication, 2FA, rate limiting, and CDN signature verification.

---

## 🎯 Interview Talking Points

If discussing this project during a software engineering interview, here are 5 key technical topics:

1. **Decoupled Direct Object Storage Architecture**: Why traditional multipart uploads stream through Node.js memory buffers creating server bottlenecks, and how Vault offloads file I/O to Backblaze B2 using signed single-part and multipart chunk URLs while preserving strict server-side authorization and storage limits.
2. **Zero-Egress Edge Caching via Bandwidth Alliance**: How the custom Cloudflare Worker validates HMAC-SHA256 tokens at the edge, serves cached byte ranges from `caches.default`, and pulls cache misses from Backblaze B2 with zero egress bandwidth charges.
3. **High-Concurrency Git Workspace Engine**: How Vault models Git repositories within MongoDB and S3 by fetching tree objects, calculating Git blob SHAs in-memory, providing a staging workbench, and constructing atomic commit trees directly via the GitHub REST API.
4. **Hierarchical Storage Invariants & Cache-Aside Redis**: Managing folder path arrays (`[rootId, parentId, childId]`) for \(O(1)\) subtree authorization checks and transactional size rollups, paired with distributed Redis cache invalidation on file mutations.
5. **Defense-in-Depth Authentication**: Multi-layer security featuring Argon2 password hashing, RFC 6238 TOTP with hashed recovery codes, signed HttpOnly cookies, decoupled rate limiters for OTP generation vs verification, and a centralized `loadPlanContext` middleware enforcing dynamic plan tier permissions.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
