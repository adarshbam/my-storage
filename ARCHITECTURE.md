# Vault Storage Architecture & Engineering Manual

<div align="center">

![Architecture](https://img.shields.io/badge/Architecture-Decoupled_Distributed_System-blue?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Argon2_%7C_TOTP_%7C_HMAC-green?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-Backblaze_B2_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-Cloudflare_Worker_CDN-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

</div>

---

## 1. Executive Summary

**Vault Storage** is an enterprise-grade cloud drive and developer workspace engineered with a stateless, decoupled architecture. Instead of routing multi-gigabyte file streams through monolithic backend web servers, Vault orchestrates direct client-to-object-storage transfers using S3 presigned URLs, Cloudflare Edge Workers with HMAC-SHA256 URL validation for egress-free CDN caching, and asynchronous libuv worker threads for zero-disk-I/O WebP thumbnail generation.

Beyond standard cloud drive capabilities (hierarchical folder navigation, tree-traversal size rollups, soft delete trash lifecycles, and cryptographic link sharing), Vault integrates a full Git workspace engine that allows cloning GitHub repositories directly into object storage, computing Git blob SHAs in-memory, managing branches, staging workbenches, and committing atomic multi-file trees directly to GitHub via the REST API.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    Client["React 19 Client SPA<br/>(Vite, Hooks, Tailwind)"]

    subgraph CDN ["Edge Gateway & CDN (Cloudflare)"]
        Worker["Cloudflare Worker<br/>- HMAC-SHA256 Sig Check<br/>- Cache API (caches.default)<br/>- Range Request Streaming"]
    end

    subgraph AppServer ["Application Backend (Node.js / Express 5)"]
        Router["Express Router & Middlewares<br/>- Helmet Security Headers<br/>- Rate Limiters (Redis Store)<br/>- Cookie Auth & Session Check<br/>- PlanContext Resolver"]
        Controllers["Thin HTTP Controllers"]
        Services["Domain Services<br/>- File & Directory Service<br/>- Git Workspace Service<br/>- Auth & 2FA Service<br/>- Subscription & Billing Service"]
        WorkerPool["Worker Pool / Libuv<br/>- Sharp WebP Compression<br/>- Fluent-FFmpeg Frame Extraction"]
    end

    subgraph Datastores ["Persistence & Caching"]
        MongoDB[("MongoDB 6.0+ (Replica Set)<br/>- ACID Multi-Doc Transactions<br/>- Compound Path Indexes<br/>- 20 Domain Collections")]
        Redis[("Redis 5 / 6<br/>- Session State & TTLs<br/>- Cache-Aside Directory Listings<br/>- Distributed Cron Locks")]
    end

    subgraph Storage ["Object Storage"]
        B2[("Backblaze B2 (S3 API)<br/>- Private Object Bucket<br/>- Presigned Direct Multipart Uploads<br/>- WebP Thumbnail Cache")]
    end

    subgraph External ["External Services"]
        GoogleDrive["Google Drive v3 API"]
        GitHub["GitHub REST API"]
        Razorpay["Razorpay Payment Gateway"]
    end

    %% Client Interactions
    Client -- "1. Auth, Navigation, Metadata (JSON)" --> Router
    Client -- "2. Direct Multipart Upload (PUT Parts)" --> B2
    Client -- "3. Signed Download / Stream (GET/Range)" --> Worker

    %% Backend Flow
    Router --> Controllers --> Services
    Services --> MongoDB
    Services --> Redis
    Services --> WorkerPool
    Services -- "Generate Presigned URLs / Manage" --> B2
    Services -- "OAuth2 & Cross-Cloud Sync" --> GoogleDrive
    Services -- "Git Tree & Blob Sync" --> GitHub
    Services -- "Plan & Checkout Management" --> Razorpay

    %% CDN Flow
    Worker -- "Bandwidth Alliance (0 Egress)" --> B2
```

---

## 3. Core Component Responsibilities

### 3.1 Frontend Client (React 19 + Vite)
- **State & Custom Hooks**: Modular state isolation via custom hooks (`useFiles`, `useUploadManager`, `useDownloadManager`, `useClipboard`, `useContextMenu`, `useSelectionBox`, `useSpeedGovernor`).
- **Direct Upload Engine**: Files `< 5MB` use single-part signed URLs; files `≥ 5MB` use chunked S3 multipart uploads with a part concurrency limit of 3, pause/resume state retention, and XMLHttpRequest upload progress monitoring.
- **Direct Streaming Downloads**: Integrates the native Web File System Access API (`window.showSaveFilePicker` and `FileSystemWritableFileStream`) to stream multi-gigabyte files directly from the edge CDN to the client's local disk without buffering into browser heap memory.

### 3.2 Application Backend (Express.js 5)
- **Thin Controller Pattern**: Controllers only extract parameters, validate headers/bodies via Zod schemas, invoke domain services, and return responses.
- **Domain Service Layer**: Houses 100% of business logic, transaction boundaries (`withTransaction`), tree traversals, and integration clients.
- **Dynamic Plan Engine (`loadPlanContext`)**: Express middleware that intercepts every request, checks the user's active Razorpay subscription, evaluates plan tier rules (`Free Trial`, `Novice`, `Pro`, `Master`, `Ultimate`), and enforces feature permissions and storage limits declaratively.
- **CPU Worker Offloading**: Sharp and FFmpeg media transformation pipelines execute asynchronously in libuv's C++ worker pool with zero disk I/O, writing generated WebP thumbnails directly into S3.

### 3.3 Edge CDN Gateway (Cloudflare Worker)
- **HMAC-SHA256 Token Verification**: Validates signed token parameters `?v=<version>&exp=<timestamp>&sig=<hmac>` using Web Crypto API.
- **Canonical Edge Caching**: Utilizes `caches.default` matching on `${origin}${pathname}?v=${version}` to cache byte-ranges and complete file objects for 24 hours.
- **Bandwidth Alliance Routing**: Fetches cache misses directly from Backblaze B2 private buckets with zero egress bandwidth charges.
- **Instant Purge API**: `/purge` authenticated endpoint allows the backend to invalidate edge cache entries instantly when files are updated or overwritten.

### 3.4 Persistence Layer (MongoDB & Redis)
- **MongoDB (ACID Transactions)**: Stores file metadata, user sessions, directory hierarchy paths, share links, and plan configurations. Multi-document transactions guarantee that parent directory sizes and path invariants remain consistent even during massive recursive moves or batch deletes.
- **Redis 5 / 6**: Serves as a high-speed cache-aside layer for directory contents (`dir:contents:<id>`), directory metadata counters (`dir:meta:<id>`), active user session tracking (`user_sessions:<userId>`), and distributed cron job locks (`lock:cron:<jobKey>`).

---

## 4. Sequence Flows & State Machines

### 4.1 Direct-to-S3 Multipart Upload Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as Express.js Backend
    participant DB as MongoDB
    participant Redis as Redis Cache
    participant S3 as Backblaze B2 (S3 API)
    participant Worker as Thumbnail Worker

    User->>API: POST /file/vault/multipart/initiate { name, size, contentType, parentDirId }
    Note over API: Middleware verifies auth & plan limits (enforceUploadLimit)
    API->>S3: CreateMultipartUploadCommand(key)
    S3-->>API: Returns uploadId
    API->>DB: withTransaction: Create File doc (uploadStatus: "uploading", uploadId)
    API->>DB: Update parent directory sizes
    API->>Redis: Invalidate dir:contents and dir:meta
    API-->>User: Returns { fileId, uploadId, key, partSize: 5MB, totalParts }

    loop For each 5MB Part (3 Concurrent Workers)
        User->>API: POST /file/vault/multipart/part-url { fileId, uploadId, partNumber, key }
        API-->>User: Returns Presigned UploadPart PUT URL (1h TTL)
        User->>S3: PUT part blob directly with XMLHttpRequest progress tracking
        S3-->>User: Returns ETag header
    end

    User->>API: POST /file/vault/multipart/complete { fileId, uploadId, key, parts: [{ PartNumber, ETag }] }
    API->>S3: CompleteMultipartUploadCommand(key, uploadId, parts)
    S3-->>API: S3 Object Assembled & Committed
    API->>DB: Update File (uploadStatus: "completed", uploadId: null)
    API->>Redis: Invalidate dir:contents and dir:meta
    API-->>User: Returns { success: true, fileId, size }

    opt Media File (Image/Video)
        API->>Worker: Asynchronously fetch object buffer & generate WebP thumbnail in-memory
        Worker->>S3: PutObjectCommand("thumbnails/<fileId>.webp")
        Worker->>DB: Update File (hasThumbnail: true)
    end
```

---

### 4.2 Secure File Delivery & Edge CDN Stream

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Browser
    participant API as Express Backend
    participant CF as Cloudflare Edge Worker
    participant Cache as Cloudflare Edge Cache (caches.default)
    participant B2 as Backblaze B2 Bucket

    Client->>API: GET /file/:id/cdn-url?action=download
    Note over API: Check cookie auth & item read permissions
    API->>API: Compute HMAC-SHA256 signature covering "/files/<id><ext>:<version>:<expires>"
    API-->>Client: Returns CDN Signed URL (1 hour validity)

    Client->>CF: GET /files/<id>.<ext>?v=1&exp=1700000000&sig=<hmac>&name=Report.pdf
    CF->>CF: Validate HMAC-SHA256 via Web Crypto API (Return 403 if invalid/expired)
    CF->>Cache: Match canonical key `${origin}/files/<id>.<ext>?v=1`

    alt Cache HIT
        Cache-->>CF: Cached File Binary (200 / 206)
        CF-->>Client: Stream binary with dynamic Content-Disposition & CORS headers
    else Cache MISS
        CF->>CF: Check in-memory B2 Authorization token (cached for 20 hours)
        CF->>B2: GET /file/<bucket>/<id>.<ext> (Passing Range header if present)
        B2-->>CF: Object Binary Stream (200 OK or 206 Partial Content)
        CF->>Cache: Save full 200 responses to caches.default (TTL: 24 hours)
        CF-->>Client: 200/206 Response with Accept-Ranges, Content-Type, Content-Disposition
    end
```

---

### 4.3 Git Workspace Synchronizer & Commit Engine

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / User
    participant Frontend as Git Workbench UI
    participant Backend as Git Workspace Service
    participant DB as MongoDB
    participant B2 as Backblaze B2
    participant GH as GitHub REST API

    Note over Dev, Frontend: Developer edits code files inside Vault web editor
    Dev->>Frontend: Save modified file
    Frontend->>Backend: PUT /file/:id { content }
    Backend->>B2: Overwrite object in B2 & increment contentVersion
    Backend->>DB: Mark file gitStatus.status = "modified"

    Dev->>Frontend: Open Git Staging Workbench & Click "Stage All"
    Frontend->>Backend: POST /git-workspace/stage { workspaceId, stageAll: true }
    Backend->>DB: Set staged = true on modified file records

    Dev->>Frontend: Click "Commit & Push" (message: "feat: update auth")
    Frontend->>Backend: POST /git-workspace/commit { workspaceId, message }
    
    loop For each staged file
        Backend->>B2: Fetch file buffer from B2
        Backend->>GH: POST /repos/:owner/:repo/git/blobs (Base64 buffer)
        GH-->>Backend: Returns blob SHA
    end

    Backend->>GH: POST /repos/:owner/:repo/git/trees (base_tree: baseSha, tree: [blobs])
    GH-->>Backend: Returns newTreeSha

    Backend->>GH: POST /repos/:owner/:repo/git/commits (message, tree: newTreeSha, parents: [baseSha])
    GH-->>Backend: Returns newCommitSha

    Backend->>GH: PATCH /repos/:owner/:repo/git/refs/heads/:branch { sha: newCommitSha }
    GH-->>Backend: Branch Ref Updated Successfully!

    Backend->>DB: Update GitWorkspace (baseSha = newCommitSha, status = "clean", stagedFiles = [])
    Backend->>DB: Update all file records (gitStatus = "unmodified", staged = false)
    Backend-->>Frontend: Commit & Push Complete ({ commitSha, shortSha })
```

---

## 5. Storage Modeling & Path Invariants

Vault represents folder structures using an **Ancestry Path Array** model. Every `Directory` and `File` document contains a `path` field storing an array of ancestor `ObjectId` references from root to self:

$$\text{path} = [\text{rootDirId}, \text{folder1Id}, \text{folder2Id}, \dots, \text{selfId}]$$

### 5.1 Subtree Authorization in \(O(1)\)
To determine if a user or shared token has access to a deeply nested file or directory, the system executes an \(O(1)\) index lookup:

```javascript
// Verification: If parent or any ancestor ID is present in the shared scope
const hasAccess = sharedItemIds.some(sharedId => file.path.includes(sharedId));
```

### 5.2 Transactional Size Rollups
When a file is uploaded, resized, or deleted, the size differential is propagated atomically across all ancestor directories in MongoDB:

```javascript
export const updateParentDirectorySize = async (parentDirIdOrPath, sizeChange, session = null) => {
  if (!parentDirIdOrPath || sizeChange === 0) return;
  
  const path = Array.isArray(parentDirIdOrPath) 
    ? parentDirIdOrPath 
    : (await Directory.findById(parentDirIdOrPath).select("path").session(session))?.path || [];

  if (path.length > 0) {
    await Directory.updateMany(
      { _id: { $in: path } },
      { $inc: { size: sizeChange } },
      { session }
    );
  }
};
```

---

## 6. Background Jobs & Distributed Synchronization

Vault executes scheduled maintenance routines via `node-cron`, protected by distributed Redis mutex locks (`SET lock:cron:<key> "locked" NX EX <ttl>`):

| Job Name | Schedule | Lock TTL | Operational Responsibility |
| :--- | :--- | :--- | :--- |
| **Storage & Trash Purge** | `0 3 * * *` (Daily 03:00 UTC) | 7200s (2h) | Soft-deleted items older than 30 days are permanently purged from MongoDB and Backblaze B2. Storage for unsubscribed users inactive for 60+ days is wiped. |
| **Stale OTP Garbage Collection** | `0 * * * *` (Hourly) | 600s (10m) | Deletes expired email and phone OTP records older than 10 minutes from the `OTP` collection. |
| **Tree Integrity & Size Reconciliation** | `0 4 * * 0` (Sunday 04:00 UTC) | 3600s (1h) | Traverses all directory hierarchies, recalculates subtree size aggregates, corrects orphaned node pointers, and ensures database counters match physical S3 storage. |

---

## 7. Known Architectural Trade-offs & Limitations

1. **Direct Upload Chunk Size**: S3 multipart uploads enforce a minimum chunk size of 5MB per part (except the final part). Files smaller than 5MB are routed through single-part presigned PUT requests.
2. **Local Replica Set Requirement**: MongoDB multi-document transactions require a replica set (`rs0`) in development and production environments.
3. **Bandwidth Alliance Dependency**: Zero-egress CDN benefits require Cloudflare and Backblaze B2 to be configured within the Bandwidth Alliance routing zone.
