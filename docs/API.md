# Vault Storage REST API Specification

This document defines the complete REST API contract for the **Vault Storage** application backend.

---

## 1. Global API Conventions

### Base URL
- Development: `http://localhost:3000`
- Production: Configured via `BACKEND_URL` / `CLIENT_URL`

### Authentication & Headers
- **Session Authentication**: Handled via signed HttpOnly cookies (`sessionId`).
- **CSRF & Credentials**: `credentials: "include"` must be passed on all frontend fetch requests.
- **Rate Limit Headers**: Responses return standard RFC `draft-8` rate limit headers:
  - `RateLimit-Limit`: Maximum allowed requests in current window.
  - `RateLimit-Remaining`: Remaining request quota.
  - `RateLimit-Reset`: Time remaining until quota window resets.

### Standard Response Formats
- **Success**: `{ "success": true, ...data }` or standard JSON object.
- **Operational Error**: `{ "message": "Error description", "details": {...} }` with HTTP `4xx` status.
- **Server Error**: `{ "message": "Internal Server Error" }` with HTTP `500`.

---

## 2. Authentication & User Endpoints (`/user`, `/otp`, `/user/2fa`)

### `POST /user/register`
Creates a new user account with a dedicated root storage directory.
- **Rate Limit**: 5 requests / hour (Argon2 protected)
- **Request Body**:
  ```json
  {
    "name": "Alex Developer",
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Welcome Alex Developer"
  }
  ```

### `POST /user/login`
Authenticates a user with email and password.
- **Rate Limit**: 15 requests / 15 minutes
- **Request Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK` (2FA Disabled)**:
  ```json
  {
    "message": "Login successful Alex Developer"
  }
  ```
- **Response `200 OK` (2FA Required)**:
  ```json
  {
    "twoFactorRequired": true,
    "tempToken": "7b8f9e...",
    "message": "Two-Factor Authentication required"
  }
  ```

### `POST /user/2fa/verify-login`
Completes authentication for 2FA-enabled accounts using a TOTP token or 5-minute temporary token.
- **Request Body**:
  ```json
  {
    "tempToken": "7b8f9e...",
    "token": "123456"
  }
  ```
- **Response `200 OK`**: Sets signed session cookies.

### `POST /user/2fa/generate`
Generates a new RFC 6238 TOTP secret and QR code URI for Google Authenticator.
- **Auth Required**: Yes
- **Response `200 OK`**:
  ```json
  {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,..."
  }
  ```

### `POST /user/2fa/verify-enable`
Verifies the first TOTP token, enables 2FA on the user account, and returns 10 single-use emergency backup recovery codes.
- **Auth Required**: Yes
- **Request Body**: `{ "token": "123456" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "recoveryCodes": [
      "A1B2-C3D4", "E5F6-G7H8", "..."
    ]
  }
  ```

### `POST /user/logout` & `POST /user/logout-all`
- `POST /user/logout`: Deletes current session and clears cookies.
- `POST /user/logout-all`: Invalidation of all active Redis session keys and database records for the authenticated user.

---

## 3. Storage & File Endpoints (`/file`)

### `POST /file/vault/initiate`
Initiates a single-part file upload (<5MB) and returns an S3 presigned PUT URL.
- **Auth Required**: Yes (`checkAuth`, `loadPlanContext`, `enforceUploadLimit`)
- **Request Body**:
  ```json
  {
    "name": "document.pdf",
    "size": 1048576,
    "contentType": "application/pdf",
    "parentDirId": "65e0a1b2c3d4e5f6a7b8c9d0"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d1",
    "signedUrl": "https://s3.us-east-005.backblazeb2.com/bucket/...?X-Amz-Signature=...",
    "fileName": "65e0a1b2c3d4e5f6a7b8c9d1.pdf"
  }
  ```

### `POST /file/vault/complete`
Marks a single-part upload as completed and triggers asynchronous WebP thumbnail processing for media assets.
- **Request Body**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d1",
    "key": "65e0a1b2c3d4e5f6a7b8c9d1.pdf"
  }
  ```

### `POST /file/vault/multipart/initiate`
Initiates a chunked S3 multipart upload for large files (≥5MB).
- **Request Body**:
  ```json
  {
    "name": "archive.zip",
    "size": 52428800,
    "contentType": "application/zip",
    "parentDirId": "65e0a1b2c3d4e5f6a7b8c9d0"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d2",
    "uploadId": "2_hive_upload_token_xxx",
    "key": "65e0a1b2c3d4e5f6a7b8c9d2.zip",
    "partSize": 5242880,
    "totalParts": 10
  }
  ```

### `POST /file/vault/multipart/part-url`
Generates a presigned S3 PUT URL for a specific 5MB multipart chunk.
- **Request Body**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d2",
    "uploadId": "2_hive_upload_token_xxx",
    "partNumber": 1,
    "key": "65e0a1b2c3d4e5f6a7b8c9d2.zip"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d2",
    "partNumber": 1,
    "signedUrl": "https://s3.us-east-005.backblazeb2.com/...?partNumber=1&uploadId=..."
  }
  ```

### `POST /file/vault/multipart/complete`
Finalizes and commits the multipart assembly in Backblaze B2.
- **Request Body**:
  ```json
  {
    "fileId": "65e0a1b2c3d4e5f6a7b8c9d2",
    "uploadId": "2_hive_upload_token_xxx",
    "key": "65e0a1b2c3d4e5f6a7b8c9d2.zip",
    "parts": [
      { "PartNumber": 1, "ETag": "d41d8cd98f00b204e9800998ecf8427e" },
      { "PartNumber": 2, "ETag": "a87ff679a2f3e71d9181a67b7542122c" }
    ]
  }
  ```

### `GET /file/:id/cdn-url`
Generates an edge HMAC-SHA256 signed Cloudflare CDN URL for direct file delivery.
- **Query Parameters**:
  - `action`: `download` (sets attachment header) or `view` (inline preview).
- **Response `200 OK`**:
  ```json
  {
    "url": "https://cdn.vaultstorage.com/files/65e0a1b2c3d4e5f6a7b8c9d1.pdf?v=1&exp=1700000000&sig=abc1234...",
    "expiresInSeconds": 3600
  }
  ```

### `GET /file/search`
High-performance file and folder search across subtrees.
- **Query Parameters**:
  - `q`: Text search query.
  - `ext`: Comma-separated extension filter (e.g. `.pdf,.png`).
  - `size`: Maximum size in megabytes.
  - `parentId`: Subtree directory ID to restrict search.

---

## 4. Directory & Hierarchy Endpoints (`/directory`)

### `GET /directory` & `GET /directory/:id`
Fetches directory contents, resolving path breadcrumbs, files, subfolders, and child item count aggregates via Redis cache-aside.
- **Response `200 OK`**:
  ```json
  {
    "_id": "65e0a1b2c3d4e5f6a7b8c9d0",
    "name": "Projects",
    "userId": "65e0a1b2c3d4e5f6a7b8c900",
    "path": [
      { "_id": "root_id", "name": "Vault" },
      { "_id": "65e0a1b2c3d4e5f6a7b8c9d0", "name": "Projects" }
    ],
    "directories": [
      {
        "_id": "65e0a1b2c3d4e5f6a7b8c9d3",
        "name": "Backend",
        "itemCount": 12,
        "filesCount": 8,
        "directoriesCount": 4,
        "size": 15420000
      }
    ],
    "files": [
      {
        "_id": "65e0a1b2c3d4e5f6a7b8c9d1",
        "name": "README.md",
        "size": 4096,
        "extension": ".md",
        "hasThumbnail": false,
        "contentVersion": 1
      }
    ]
  }
  ```

### `POST /directory/move` & `POST /directory/copy`
Atomically moves or copies a batch of files and directories to a new destination folder within an ACID MongoDB transaction, updating parent sizes and preventing cyclical nesting.

---

## 5. Git Workspace Endpoints (`/git-workspace`)

### `POST /git-workspace/clone`
Clones a remote GitHub repository tree into a dedicated Vault workspace directory.
- **Request Body**:
  ```json
  {
    "owner": "octocat",
    "repo": "Hello-World",
    "branch": "main",
    "destinationFolderId": "65e0a1b2c3d4e5f6a7b8c9d0",
    "folderName": "Hello-World"
  }
  ```

### `GET /git-workspace/status`
Inspects workspace working tree changes against base Git tree SHAs.
- **Response `200 OK`**:
  ```json
  {
    "workspace": {
      "repoOwner": "octocat",
      "repoName": "Hello-World",
      "branch": "main",
      "baseSha": "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d"
    },
    "untracked": [],
    "modified": [
      {
        "_id": "65e0a1b2c3d4e5f6a7b8c9e1",
        "name": "index.js",
        "path": "src/index.js",
        "status": "modified",
        "staged": true
      }
    ],
    "staged": [
      { "path": "src/index.js", "status": "modified" }
    ],
    "aheadBy": 1,
    "behindBy": 0,
    "isClean": false
  }
  ```

### `POST /git-workspace/commit`
Creates blobs, constructs a new tree object, generates a commit, and updates the remote branch ref atomically via GitHub REST API.
- **Request Body**:
  ```json
  {
    "workspaceId": "65e0a1b2c3d4e5f6a7b8c9f0",
    "message": "feat: add user authentication",
    "description": "Implemented Argon2 and TOTP 2FA"
  }
  ```

---

## 6. Sharing & Permissions Endpoints (`/share`)

### `POST /share/link`
Generates a cryptographic share link with granular options.
- **Request Body**:
  ```json
  {
    "items": [
      { "id": "65e0a1b2c3d4e5f6a7b8c9d1", "type": "file" }
    ],
    "permissions": ["read", "write"],
    "hasPassword": true,
    "password": "SharePassword123",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "accessType": "restricted"
  }
  ```
- **Response `200 OK`**: Returns cleartext share URL token `token: "a1b2c3d4..."`.

---

## 7. Subscriptions & Billing Endpoints (`/subscriptions`, `/billing`, `/webhooks`)

### `POST /subscriptions/create`
Initiates a Razorpay subscription checkout session for a designated billing plan.
- **Request Body**: `{ "planId": "65e0a1b2c3d4e5f6a7b8c999" }`
- **Response `200 OK`**: `{ "subscriptionId": "sub_NxXxXxXx", "razorpayKeyId": "rzp_live_xxx" }`

### `POST /webhooks/razorpay`
Validates `X-Razorpay-Signature` HMAC and dispatches event handlers for `subscription.activated`, `subscription.charged`, `subscription.paused`, `subscription.halted`, and `payment.failed`.
