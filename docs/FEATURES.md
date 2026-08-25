# Vault Storage Feature Inventory & Implementation Matrix

This document provides a strict, code-verified inventory of all features within the **Vault Storage** repository. Every capability is categorized according to its true implementation state.

---

## 1. Feature Classification Overview

| Category | Definition | Count in Codebase |
| :--- | :--- | :--- |
| **Fully Implemented** | Complete end-to-end functionality (Controller, Service, Database Models, and UI/Hooks active). | 24 Subsystems |
| **Partially Implemented** | Meaningful functional implementation exists, but specific edge-case flows or sub-features are in progress. | 3 Subsystems |
| **External Integration** | Relies on third-party cloud SDKs, APIs, and OAuth providers. | 4 Integrations |
| **Planned / Experimental** | Early prototypes or architectural scaffolds reserved for future releases. | 1 Subsystem |

---

## 2. Fully Implemented Features

### 2.1 File & Directory Management
- **Hierarchical Navigation**: Unlimited folder nesting with breadcrumb navigation (`BreadcrumbNav.jsx`), folder open/close state, and path ancestry resolution.
- **Direct S3 Single-Part Uploads (<5MB)**: Presigned PUT URL generation with `ContentLength` and `ContentType` validation in Backblaze B2.
- **Direct S3 Multipart Uploads (≥5MB)**: Chunked 5MB upload engine with part signing, pause/resume state management, XMLHttpRequest upload progress tracking, and atomic S3 assembly.
- **Direct Edge CDN Delivery & Streaming**: HMAC-SHA256 signed URLs validated by a Cloudflare Edge Worker with `Accept-Ranges` byte-range seeking for video/audio players.
- **File System Access API Streaming Downloads**: Direct-to-disk streaming download manager using `window.showSaveFilePicker` and `FileSystemWritableFileStream` with dynamic speed governor pacing.
- **Recursive Move & Copy**: Subtree copying and moving in Backblaze B2 and MongoDB with duplicate naming resolution (`"File - Copy (1).ext"`) and ancestry cycle protection.
- **Batch Deletions**: Atomic multi-item deletions updating parent directory sizes and moving items to soft-delete Trash.
- **Inline Text & Code Editor**: In-browser code editing for `.js`, `.py`, `.json`, `.md`, `.txt`, `.html`, `.css` with syntax highlighting and automatic `contentVersion` incrementation.
- **Multithreaded WebP Thumbnail Generation**: In-memory Sharp and Fluent-FFmpeg image/video frame transformation offloaded to libuv C++ worker threads without disk I/O.
- **Full-Text & Extension Search**: Search filtering across filenames, extensions (`.pdf`, `.png`), size bounds, and parent subtrees with regex sanitization and Redis metadata caching.

### 2.2 Native Git Workspaces
- **Repository Mounting / Cloning**: Downloads GitHub repository trees into object storage, creating matching Directory and File models.
- **In-Memory Git Blob Hashing**: Computes standard Git blob SHAs (`sha1("blob <size>\0<content>")`) in RAM for accurate change detection.
- **Working Tree Change Tracker**: Classifies workspace files as `unmodified`, `added`, `modified`, or `deleted`.
- **Git Staging Workbench**: Visual stage/unstage interface for individual files or entire workspaces (`GitStagingWorkbenchModal.jsx`).
- **Atomic Multi-File Commit & Push**: Uploads blobs to GitHub, constructs a new tree object (`git/trees`), creates a commit (`git/commits`), and updates the remote branch ref (`git/refs/heads/:branch`) via the GitHub REST API.
- **Branch Management**: List branches, create new branches, and switch workspace HEAD.
- **Stash Drawer**: Stash uncommitted changes with custom messages, list saved stashes, apply stashes to working tree, and drop stashes.
- **File History & Diff Viewer**: Side-by-side diff inspection comparing local file buffers against base Git commit tree SHAs (`GitDiffViewer.jsx`).

### 2.3 Cryptographic Sharing & Access Control
- **Signed Share Links**: Cryptographically generated 256-bit hex tokens (`crypto.randomBytes(32)`) hashed with SHA-256 in MongoDB.
- **Password-Protected Links**: Optional password protection hashed with Argon2.
- **Expiring Links**: Time-bound expiration dates enforced at access time.
- **Granular Permissions**: Configurable `read`, `write`, or `owner` permission scopes per link.
- **Shared Drives**: Allows invited users to mount and browse shared vaults directly in their dashboard (`specialView="shared"`).

### 2.4 Multi-Factor Authentication & Account Security
- **Argon2 Password Hashing**: State-of-the-art password protection against GPU brute-force attacks.
- **TOTP Two-Factor Authentication**: RFC 6238 time-based one-time passwords compatible with Google Authenticator and Authy.
- **Hashed Backup Recovery Codes**: 10 single-use emergency recovery codes hashed in MongoDB.
- **Phone & Secondary Recovery Email Verification**: SMS and Email OTP verification with rate-limited generation.
- **Signed Session Cookies**: Cookie integrity verified with HMAC signatures and 15-minute Redis session caching.

### 2.5 Billing, Subscriptions & Dynamic Plan Engine
- **Razorpay Checkout Integration**: Automated recurring subscription lifecycle management (`created`, `authenticated`, `active`, `paused`, `halted`, `cancelled`, `expired`).
- **Modular Webhook Dispatcher**: Signature-verified webhook handler for 10 Razorpay event types.
- **Dynamic PlanContext Middleware**: Declarative enforcement of plan tier permissions (`allowUpload`, `allowSharing`, `allowEdit`) and storage limits.
- **30-Day Read-Only Grace Period**: Automated lockdown for unsubscribed accounts with daily warning notifications before asset purging.

### 2.6 Automated Garbage Collection & Jobs
- **Daily Storage & Trash Purge**: Scheduled cron job at `03:00 UTC` with distributed Redis locking to delete expired trash and inactive account assets.
- **Hourly Stale OTP Cleanup**: Purges expired verification tokens older than 10 minutes.
- **Weekly Directory Reconciliation**: Sunday `04:00 UTC` deep reconciliation verifying tree pointers and recalculating storage sizes against physical S3 assets.

---

## 3. Partially Implemented Features

### 3.1 Google Drive Two-Way Sync
- **What works**: OAuth2 connect/disconnect flow, mounting Google Drive root and folder navigation, downloading Google Drive files to Vault, and uploading Vault files to Google Drive.
- **Current status**: Bidirectional real-time webhook change synchronization is not yet implemented; synchronization occurs on-demand.

### 3.2 GitHub Releases & Pull Request Creation UI
- **What works**: Full backend endpoints for listing/creating PRs, fetching releases, and dispatching GitHub Actions workflows (`githubController.js`).
- **Current status**: UI modal components exist (`GitPullRequestsView.jsx`, `GitReleasesView.jsx`), but automated CI/CD logs streaming is limited to status polling.

### 3.3 Wally Academy / Interactive Tutorial
- **What works**: Interactive UI guide mascot (`WallMascot.jsx`, `WallGuideOverlay.jsx`, `WallyAcademyPage.jsx`) with step-by-step tour context.
- **Current status**: Guides file navigation and UI shortcuts; advanced interactive playground drills are partially authored.

---

## 4. External Integrations

| Integration | Provider | Purpose | Status |
| :--- | :--- | :--- | :--- |
| **Object Storage** | Backblaze B2 (S3 API) | Primary file storage, chunked uploads, thumbnails | Fully Active |
| **Edge CDN** | Cloudflare Workers | Edge caching, HMAC verification, 0-egress proxy | Fully Active |
| **Payments** | Razorpay | Subscriptions, recurring charges, invoices, webhooks | Fully Active |
| **OAuth & APIs** | Google & GitHub | Google Sign-In, Google Drive v3, GitHub REST API | Fully Active |
| **Email & SMS** | Nodemailer / Twilio | Transactional emails, password resets, SMS OTP | Fully Active |

---

## 5. Planned / Prototype Capabilities

- **Direct WebRTC P2P Vault Transfer**: Scaffolding exists for peer-to-peer room exchanges; currently routed through signed cloud storage URLs.
