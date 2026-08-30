# Vault Cloud Storage & Workspace — Frontend Client

<div align="center">

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.33.0-FF0055?style=for-the-badge&logo=framer&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

<p align="center">
  <strong>High-performance, modern cloud storage client and developer workspace Single Page Application (SPA).</strong><br>
  Engineered with React 19, Vite, and Tailwind CSS. Features direct client-to-S3 multipart uploads, byte-range media streaming via Cloudflare Edge CDN, in-browser Git workspace with code editing, TOTP/SMS Multi-Factor Authentication, and dynamic tier-based plan context.
</p>

[Key Features](#-key-features--technical-highlights) • [Architecture](#-frontend-architecture) • [Getting Started](#-getting-started) • [Deployment](#-deployment-guide) • [Interview Talking Points](#-interview-talking-points)

</div>

---

## ⚡ Overview

**Vault Frontend** is the user interface and client orchestrator for the Vault cloud storage platform. Built from the ground up to deliver a desktop-grade user experience in the browser, Vault offloads heavy file processing to the client and edge:

1. **Direct-to-S3 Chunked Uploads**: Files bypass the application server entirely during upload; the client orchestrates concurrent chunk uploads directly to Backblaze B2 (S3-compatible) with real-time percentage, pause/resume, and abort capabilities.
2. **Edge-Accelerated Media Streaming**: Media files and previews stream directly from Cloudflare Workers with HMAC-SHA256 authenticated URLs and full HTTP `Range` request support for smooth audio/video scrubbing.
3. **Interactive In-Browser Git Workspace**: Developers can browse GitHub repositories, navigate directory trees, view code with Prism syntax highlighting, edit files directly, stage changes, and commit atomic trees back to GitHub.
4. **Defense-in-Depth Authentication Flow**: Google OAuth 2.0, GitHub OAuth, Firebase SMS verification, RFC 6238 TOTP authenticator setup with QR codes, and downloadable recovery code management.

---

## 🏛️ System Interaction Architecture

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
│     Backblaze B2 (S3 API)     │  │   Cloudflare Edge Worker CDN  │  │    Vault Express 5 Backend    │
│  - Presigned Chunk Uploads    │  │  - HMAC-SHA256 Token Stream   │  │  - Auth & Session Cookies     │
│  - Concurrency & Pause/Resume │  │  - Byte-Range Audio/Video     │  │  - Presigned URL Dispenser    │
│  - Zero Server Bandwidth Load │  │  - Sub-50ms Global Cache      │  │  - Dynamic RBAC Plan Context  │
└───────────────────────────────┘  └───────────────────────────────┘  └───────────────────────────────┘
```

---

## 🌟 Key Features & Technical Highlights

| Feature Subsystem | Technical Implementation | Engineering Impact |
| :--- | :--- | :--- |
| **Direct S3 Upload Pipeline** | Custom `useUploadManager` hook + chunk slicing (`File.slice`) communicating with backend presigned chunk endpoints. | Eliminates server memory bottlenecks; seamlessly handles files up to plan limit (e.g. 5GB+) with live speed, ETA, and progress calculation. |
| **Media Player & Previews** | `FilePreviewModal` supporting HTML5 Video/Audio with range requests, PDF rendering, image WebP preview, and code view. | Seamless, low-latency streaming directly from the edge without intermediate backend proxying. |
| **In-Browser Git Workspace** | `react-simple-code-editor` + `prismjs` integrated with GitHub tree traversal and staging workbenches. | Turns object storage into a lightweight web IDE allowing code navigation, editing, and committing directly to GitHub. |
| **Multi-Factor Auth UI** | RFC 6238 QR code canvas generation (`qrcode`), TOTP challenge verification, Firebase Phone Auth OTP, and recovery code modals. | Enterprise-grade 2FA onboarding and recovery UX with zero plaintext credential exposure. |
| **Dynamic Tier-Based Context** | React Context (`PlanContext`, `AuthContext`) dynamically consuming server plan metadata and updating UI access gates in real-time. | Feature flags, storage quotas, and tier badges update instantly without requiring full-page reloads. |
| **File System Access Integration**| Native Web [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (`showSaveFilePicker`, `WritableStream`) for batch direct-to-disk downloads. | Allows large batch downloads without crashing browser tab memory via blob accumulation. |

---

## 📁 Repository Structure

```text
Frontend/
├── public/
│   ├── _redirects                     # SPA redirect configuration for Netlify/Cloudflare Pages
│   └── vite.svg                       # Application branding & icons
│
├── src/
│   ├── api/                           # Centralized API service layer
│   │   ├── authApi.js                 # Login, Register, 2FA, OTP & OAuth API calls
│   │   ├── driveApi.js                # Folders, items, trash, search, and storage stats
│   │   ├── fileApi.js                 # Presigned single & multipart upload endpoints
│   │   ├── gitWorkspaceApi.js         # Git clone, branches, commits, and tree endpoints
│   │   └── billingApi.js              # Subscription plans & Razorpay checkout verification
│   │
│   ├── components/                    # Modular, encapsulated React components
│   │   ├── auth/                      # 2FA QR modal, OTP input fields, Auth route guards
│   │   ├── billing/                   # Plan comparison cards, Razorpay payment triggers
│   │   ├── dashboard/                 # Topbar, NavigationRail, Sidebar, QuickAction modals
│   │   ├── drive/                     # FileGrid, FolderList, FilePreviewModal, UploadDrawer, Breadcrumb
│   │   ├── git/                       # GitRepoTree, CodeEditorModal, StagingWorkbench, BranchSelector
│   │   ├── profile/                   # SecuritySettings, DeviceSessionsTable, RecoveryCodesDialog
│   │   └── ui/                        # Button, Input, Dropdown, Modal, Toast, Skeleton components
│   │
│   ├── context/                       # Shared React Contexts
│   │   ├── AuthContext.jsx            # User authentication state, login/logout, session tracking
│   │   ├── PlanContext.jsx            # Dynamic plan metadata, active storage quotas & permissions
│   │   └── ThemeContext.jsx           # Dark/Light theme mode state and persistence
│   │
│   ├── hooks/                         # Custom reusable React hooks
│   │   ├── useUploadManager.js        # Multipart upload queue, concurrency limit, progress & pause
│   │   ├── useDownloadManager.js      # Streamed downloads & File System Access API integration
│   │   └── useKeyboardShortcuts.js    # Global keyboard shortcuts (Ctrl+K search, Esc close, Delete)
│   │
│   ├── layouts/                       # Application layouts
│   │   ├── DashboardLayout.jsx        # Authenticated responsive sidebar + main viewport layout
│   │   └── AuthLayout.jsx             # Centered glassmorphic container for auth flows
│   │
│   ├── pages/                         # Route view components
│   │   ├── FileBrowser.jsx            # Core cloud drive view with drag-and-drop & sorting
│   │   ├── GitWorkspacesPage.jsx      # GitHub repositories & code editing workspace
│   │   ├── BillingPlansPage.jsx       # Pricing tiers, feature matrices & subscription upgrades
│   │   ├── Profile.jsx                # User profile, 2FA security center, device management
│   │   ├── Login.jsx / Register.jsx   # Authentication pages with OAuth & 2FA hooks
│   │   └── VerifyOtp.jsx              # SMS & TOTP verification challenge page
│   │
│   ├── lib/                           # Helper utilities
│   │   ├── api.js                     # Configured Axios/Fetch client with cookie credentials
│   │   ├── firebase.js                # Firebase Phone Auth initialization
│   │   ├── formatters.js              # Bytes to human-readable size (KB, MB, GB), dates
│   │   └── utils.js                   # Classnames merger (`clsx` + `tailwind-merge`)
│   │
│   ├── App.jsx                        # React Router 7 route definitions & route protection
│   ├── main.jsx                       # Application bootstrap & Context Provider hierarchy
│   └── index.css                      # Tailwind base, utilities, and custom scrollbars
│
├── vercel.json                        # Vercel SPA rewrite configuration
├── vite.config.js                     # Vite 7 build configuration with code splitting
├── tailwind.config.js                 # Custom design tokens, colors & dark mode configuration
├── eslint.config.js                   # ESLint flat config with React Hooks linting
└── package.json                       # Dependencies & script definitions
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** (`v10+`), **pnpm**, or **yarn**
- **Vault Backend API** running locally or deployed (see [Backend Repository](https://github.com/adarshbam/my-storage))

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/adarshbam/my-storage-frontend.git
cd my-storage-frontend

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
| `VITE_SERVER_URL` | Base URL of the Vault Backend API | `http://localhost:4000` |
| `VITE_GOOGLE_CLIENTID` | Google OAuth Web Client ID | `your_client_id.apps.googleusercontent.com` |
| `VITE_GITHUB_CLIENTID` | GitHub OAuth App Client ID | `your_github_client_id` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Publishable Key ID | `rzp_test_xxxxxx` |
| `VITE_MAX_FILE_SIZE` | Maximum file size in bytes for pre-validation | `104857600` (100MB) |
| `VITE_FIREBASE_*` | Firebase project config for SMS 2FA | `AIzaSy...` |

### 3. Development Mode

```bash
npm run dev
```
The Vite development server will start at `http://localhost:5173` with Hot Module Replacement (HMR).

### 4. Production Build & Preview

```bash
# Build optimized production bundle to /dist
npm run build

# Preview the production build locally
npm run preview
```

---

## 🌐 Deployment Guide

### Deploying to Vercel (Recommended)

1. Import the repository in the **Vercel Dashboard**.
2. Set the Framework Preset to **Vite**.
3. Add your Environment Variables (`VITE_SERVER_URL`, `VITE_GOOGLE_CLIENTID`, etc.).
4. The included `vercel.json` ensures all client-side routes (`/drive`, `/profile`, `/billing`) route to `index.html`.
5. Click **Deploy**.

### Deploying to Netlify / Cloudflare Pages

- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- The included `public/_redirects` file (`/* /index.html 200`) ensures single-page routing works seamlessly.

### Deploying via Docker & Nginx

```dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Serve Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🎯 Interview Talking Points

If discussing this frontend application during a frontend engineering or full-stack interview:

1. **Direct-to-S3 Multipart Upload Architecture**:
   - *Problem*: Traditional file uploads route entire multi-gigabyte payloads through the Node.js backend, saturating backend CPU, memory, and bandwidth.
   - *Solution*: Designed a decoupled client state machine (`useUploadManager`) that requests presigned S3 URLs from the backend, slices files into 5MB–20MB binary chunks via `File.slice()`, and concurrently uploads chunks directly to object storage with progress tracking, pause/resume, and retry backoff.

2. **Web Crypto & Zero-Egress Edge Media Streaming**:
   - Explain how video and audio streaming bypasses the backend API by requesting time-limited HMAC-signed CDN tokens rendered in `FilePreviewModal`. The edge worker serves byte-range chunks directly from Cloudflare's global edge cache with zero egress fees via the Bandwidth Alliance.

3. **In-Browser Git Workspace Implementation**:
   - Explain how the client manages virtual Git workbenches by binding the GitHub REST API and Vault storage. The UI calculates blob SHAs in-memory, provides an interactive syntax-highlighted code editor (`prismjs`), maintains local uncommitted diffs, and constructs atomic tree commits.

4. **Robust Auth State & Route Protection**:
   - Describe the multi-layered `AuthContext` + `PlanContext` architecture. Session credentials use secure, signed `HttpOnly` cookies. The client maintains non-sensitive user metadata in memory, gracefully handles 401 token refreshes, and dynamically gates UI features based on plan capabilities.

5. **Performance & Bundle Optimization**:
   - Implemented dynamic code-splitting via `React.lazy` and manual Vite/Rollup chunk segmentation, keeping the initial payload lightweight and deferring heavy editor (`prismjs`) and preview assets until requested.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
