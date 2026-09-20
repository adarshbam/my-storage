# 🧠 MASTER PROJECT & ENGINEERING MEMORY CAPSULE
> **Generated on:** September 20, 2026
> **Purpose:** 100% Context Preservation & Handshake across Antigravity Sessions, Google Accounts, and AI Conversations.

---

## 👤 Executive Profile & North-Star Goal
- **Engineer:** Adarsh Singh (`adarshbam` on GitHub)
- **Target Roles:** US Remote / Tier-1 Global Software Engineering (Target: $60,000 - $100,000+ / 50+ LPA) at top-tier companies (Meta, SpaceX, Google, OpenAI, Anthropic).
- **Core Specialization:** Distributed Backend Systems, High-Concurrency Media Streaming, Cloud Infrastructure (AWS, Cloudflare Edge), and Full-Stack React 19 Architectures.
- **Working Model with AI:** The AI acts as the Senior Lead Pair-Programmer / Implementer. Adarsh decides high-level system designs, approves trade-offs, and directs architecture; the AI writes production-grade code, verifies it, and executes deployments.

---

## 🏛️ Master Engineering Roadmap & Exact Status

| Phase | System / Milestone | Status | Key Highlights |
|---|---|---|---|
| **Phase 1** | **Profile & Repository Sanitization** | **COMPLETED ✅** | 28 scratch repos privatized; 7 public showcase repos curated; profile README updated with 100% responsive cards & girlfriend project story. |
| **Phase 2** | **Vault Cloud Multi-Tier Production Deployment** | **COMPLETED ✅** | Live at `https://yourvaultstorage.com`. React 19 on S3 + CloudFront (ACM SSL). Express 5 on AWS EC2 (PM2 cluster, Nginx reverse proxy). Redis Cloud + MongoDB Atlas. Backblaze B2 S3 + Cloudflare CDN ($0 egress). |
| **Phase 3** | **Custom CI/CD Pipeline & Build Runner** | **IN PROGRESS 🚀** | Webhook listener at `/github-webhook` and `/webhooks/github`. Asynchronous child process runner (`scripts/deploy-full.sh`), mutex `isDeploying` lock, fast HTTP 200 responses, `dummyTest.js`. |
| **Phase 4** | **The KRAKEN 3D WebGL Systems Portfolio** | **QUEUED ⏳** | Interactive Three.js / React Three Fiber visualizer with live infrastructure topology nodes and recruiter fast-track drawer. |
| **Phase 5** | **CodeRacer Multiplayer Benchmark Platform** | **QUEUED ⏳** | Built from scratch. Syntax-aware AST typing, millisecond event-loop timers, WebSocket rooms, Redis matchmaking, and ELO leaderboards. |
| **Phase 6** | **Vault MCP Server & Autonomous AI Agent** | **QUEUED ⏳** | Model Context Protocol integration for natural language file operations and vector semantic search. |
| **Phase 7** | **AutoOps SRE Engine & Architecture RFCs** | **QUEUED ⏳** | Observability metrics, self-healing pull request engine, published RFC whitepapers. |
| **Phase 8** | **High-Signal LinkedIn Campaign & ATS Resume** | **QUEUED ⏳** | 10 deep-dive technical posts and 1-page ATS-optimized resume. |

---

## 🌐 Live Production Infrastructure & Credentials Context

### 1. Vault Production Engine
- **Live Domain:** `https://yourvaultstorage.com` (also `www.yourvaultstorage.com`, `origin.yourvaultstorage.com`).
- **Frontend Hosting:** AWS S3 (`s3://yourvaultstoragefrontend`) + AWS CloudFront (`E1GUK9KTGYZNFE`) with automated Amazon Certificate Manager (ACM) SSL.
- **Backend API Hosting:** AWS EC2 Ubuntu instance running Node.js 20 LTS + Express 5 in PM2 cluster mode on port 4000.
- **Reverse Proxy:** Nginx configured as a pure API Gateway with Certbot SSL and streaming proxy settings (`proxy_buffering off; client_max_body_size 100M;`).
- **Database & Cache:**
  - MongoDB Atlas: `mongodb+srv://adarshsinghbam_db_user:...@yourvaultstorage.ofmskec.mongodb.net/vault`
  - Redis Cloud: `redis://default:...@meaningful-wise-tongue-81015.db.redis.io:19559`
- **Object Storage & CDN:**
  - Backblaze B2 S3 Bucket: `secure-vault-storage` (`s3.ca-east-006.backblazeb2.com`) with custom CORS headers for direct chunk uploads.
  - Cloudflare Worker CDN: `cdn.yourvaultstorage.com` for $0 egress fees via the Bandwidth Alliance.

### 2. Live Netlify Showcases
- **Valentine's Day Experience:** `https://valentinesdaypresentformybubu.netlify.app/`
- **Our Love Story Timeline:** `https://our-sweet-love-story.netlify.app/`

---

## ⚙️ Custom CI/CD Pipeline Architecture (`scripts/` & `Backend/`)
- **Webhook Endpoint:** `POST /github-webhook` and `POST /webhooks/github`
- **Status Endpoint:** `GET /github-webhook/status`
- **Deployment Controller & Service:**
  - `Backend/webhooks/github/github.webhook.controller.js` (returns instant `200 OK` queued response, preventing GitHub timeouts).
  - `Backend/webhooks/github/github.webhook.service.js` (manages `isDeploying` lock, captures stdout/stderr, tracks last deployment state).
- **Deployment Scripts:**
  - `scripts/deploy-full.sh`: Pulls git $\rightarrow$ runs frontend tests $\rightarrow$ builds frontend & syncs to S3 $\rightarrow$ invalidates CloudFront $\rightarrow$ updates backend npm $\rightarrow$ reloads PM2.
  - `scripts/deploy-frontend.sh`: Frontend S3/CloudFront deployment only.
  - `scripts/deploy-backend.sh`: Backend PM2 reload only.
  - `deploy-full.sh`: Root convenience wrapper.
- **Frontend Test Suite:**
  - `Frontend/dummyTest.js`: Controlled via `process.env.TEST_SHOULD_FAIL` (defaults to passing with code 0).

---

## 📌 Critical Development Rules
1. **New Projects Directory:** Always create new standalone projects inside `C:\Users\Dell\Desktop\Vibe-coding\`.
2. **Never break working production:** The backend on EC2 and frontend on S3/CloudFront must remain functional during changes.
3. **No rigid HTML tables:** Always use 100% full-width responsive Markdown elements for documentation and READMEs to prevent mobile squishing.
4. **Git Branch Conventions:** Main production branch is `main` (except `our-love-story-repo` which uses `master`).