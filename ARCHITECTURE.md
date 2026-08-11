# Vault Storage Architecture & Engineering Manual

## Overview

Vault Storage is a modern full-stack cloud storage application built on Express.js and React (Vite/Tailwind). The application underwent a comprehensive architectural refactoring to strictly enforce:

1. **Separation of Concerns**: Thin HTTP Controllers, dedicated Business Logic Services, Infrastructure Integrations, and custom React Hooks.
2. **Domain Boundaries**: Feature-based separation across Storage, Authentication & User Management, External Cloud Integrations, and Payments/Subscriptions.
3. **Zero Behavioral Changes**: API contracts, database schemas, Razorpay logic, session cookies, and user permissions are strictly preserved.

---

## Architectural Principles

```
[ Frontend Component ]
        │
        ▼ (custom hook / src/api/*.api.js)
[ HTTP Request ]
        │
        ▼
[ Express Router ] ──► [ Middleware (Auth, RateLimit, Validation) ]
        │
        ▼
[ Thin Controller ]
        │
        ▼
[ Domain Service ]
        ├──► [ Database Model (Mongoose) ]
        ├──► [ Cache Layer (Redis) ]
        └──► [ Infrastructure Integration (S3/B2, Razorpay, Email, OAuth) ]
```

---

## Backend Architecture

### Directory Structure

```
Backend/
├── app.js                           # Express entry point & middleware registration
├── config/                          # Environment & static configuration
│   └── config.js                    # Global parameters & cookie configurations
├── errors/                          # Application-level error definitions
│   └── AppError.js                  # Standardized HTTP AppError class
├── jobs/                            # Background jobs
│   └── cleanup.job.js               # Scheduled S3/B2 & MongoDB garbage collection
├── integrations/                    # Infrastructure Wrappers
│   ├── cdn/                         # CDN wrappers
│   │   └── cloudflare.service.js
│   ├── email/                       # Email dispatchers
│   │   └── email.service.js
│   ├── razorpay/                    # Razorpay SDK client instance
│   │   └── razorpay.client.js
│   └── storage/                     # Backblaze B2 / AWS S3 client & operations
│       └── s3.client.js
├── middlewares/                     # Express middlewares (Auth, RateLimit, Validation, Upload limits)
├── models/                          # Mongoose Database Schemas
├── routes/                          # Express Route definitions
├── services/                        # Core Business Logic Layer
│   ├── auth.service.js              # User auth, registration, OAuth, sessions
│   ├── billing.service.js           # Invoice generation logic
│   ├── directory.service.js         # Folder CRUD, tree traversal, recursive zip/copy
│   ├── drive.service.js             # Google Drive OAuth & cross-cloud transfers
│   ├── file.service.js              # File upload/download/stream, thumbnailing, search
│   ├── github.service.js            # GitHub repo REST integrations & workspace sync
│   ├── otp.service.js               # OTP generation and validation
│   ├── plan.service.js              # Subscription plans & owner settings
│   ├── share.service.js             # Cryptographic share links & permissions
│   ├── subscription.service.js      # Subscription lifecycle logic
│   ├── systemConfig.service.js      # Global system parameters
│   ├── systemUsers.service.js       # Admin user management & role hierarchy
│   ├── trash.service.js             # Soft delete, restore, & permanent purge
│   └── user.service.js              # Profile updates, theme, search history
├── utils/                           # Utility helpers (authHelpers, sanitize, safePath)
├── validators/                      # Zod validation schemas
└── webhooks/                        # Modular Webhook Engine
    └── razorpay/                    # Razorpay Webhook dispatcher & handlers
        ├── handlers/
        │   ├── payment.captured.handler.js
        │   ├── payment.failed.handler.js
        │   ├── subscription.activated.handler.js
        │   ├── subscription.cancelled.handler.js
        │   ├── subscription.halted.handler.js
        │   ├── subscription.paused.handler.js
        │   ├── subscription.pending.handler.js
        │   └── subscription.resumed.handler.js
        ├── razorpay.webhook.controller.js
        └── razorpay.webhook.service.js
```

---

## Frontend Architecture

### Directory Structure

```
Frontend/src/
├── api/                             # Centralized API Service Layer
│   ├── auth.api.js                  # Authentication & OTP API calls
│   ├── billing.api.js               # Subscriptions & plans API calls
│   ├── directories.api.js           # Vault directory API calls
│   ├── drive.api.js                 # Google Drive API calls
│   ├── files.api.js                 # Vault file API calls
│   ├── github.api.js                # GitHub integration API calls
│   ├── ownerSettings.api.js         # Owner settings API calls
│   ├── share.api.js                 # Shared access API calls
│   ├── systemConfig.api.js          # System config API calls
│   ├── trash.api.js                 # Trash API calls
│   └── users.api.js                 # User profile API calls
├── components/                      # Reusable UI & Presentational Components
│   ├── billing/                     # Billing UI components
│   ├── dashboard/                   # Dashboard layouts & navigation
│   ├── drive/                       # File Browser Presentational Components
│   │   ├── BreadcrumbNav.jsx        # Path navigation bar
│   │   ├── ContextMenu.jsx          # Context menu overlay
│   │   ├── EmptyState.jsx           # Empty directory placeholder
│   │   ├── FileBrowser.jsx          # File manager orchestrator
│   │   ├── FileOperationModals.jsx  # Rename, create, delete modals
│   │   ├── SelectionBox.jsx         # Drag-to-select rectangle
│   │   ├── TransferManager.jsx      # Upload/Download transfer panel
│   │   └── TrashView.jsx            # Trash manager
│   └── ui/                          # Radix/Tailwind UI primitives
├── context/                         # React Contexts (AuthContext, DriveContext)
├── hooks/                           # Custom React Hooks
│   ├── useBilling.js                # Subscription & billing state management
│   ├── useClipboard.js              # Copy/cut/paste session state
│   ├── useContextMenu.js            # Right-click menu positioning
│   ├── useDownloadManager.js        # File download queue & progress
│   ├── useDriveFiles.js             # Google Drive folder navigation
│   ├── useFileOperations.js         # Modal state & file CRUD operations
│   ├── useFiles.js                  # Vault file fetching, search & state
│   ├── useGithubFiles.js            # GitHub repo navigation
│   ├── useSelectionBox.js           # Mouse selection rectangle logic
│   └── useUploadManager.js          # Chunked upload queue & speed calculation
├── lib/                             # Core utilities & API Client
│   ├── api.js                       # Base URL exports
│   └── apiClient.js                 # Fetch wrapper with credentials & JSON/stream handling
├── pages/                           # Application Views
└── App.jsx                          # Main routing & layout assembly
```

---

## Developer Guidelines & Rules

1. **Controllers Must Remain Thin**: Controllers extract request params/body/query, invoke a service method, and format the response or pass errors to `next()`. Business logic inside controllers is strictly forbidden.
2. **Services Contain Business Logic**: All validation, authorization checks, DB interactions, and caching occur in services. Services must not manipulate raw Express `req`/`res` objects unless handling direct HTTP streaming (e.g. file downloads).
3. **Integrations Abstract External APIs**: S3/B2, Razorpay, and Email SDKs are isolated in `Backend/integrations/`. Services import integrations, not raw SDKs.
4. **API Calls via API Client**: All frontend API calls must be declared inside `src/api/*.api.js` using `apiClient`. Direct `fetch` calls inside React components are forbidden.
