# CaseBridge — Production Deployment & Operations Guide
### AICTE Institution Complaint Monitoring & Coordination System
**Smart India Hackathon 2026 | Problem Statement: SIH26264**

---

## 1. Executive Summary & Architecture

CaseBridge is architected as a **unified, high-reliability enterprise web application** designed to adhere to Indian government GIGW (Guidelines for Indian Government Websites) standards.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CASEBRIDGE ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│  Client SPA (React 18)       │        │  Backend API (Express.js / Node)  │
│  - Noto Sans & GIGW Palette  │        │  - REST API Engine                │
│  - High-Density Data Tables  │◄──────►│  - Deterministic Routing (UVP 1) │
│  - Lucide Icons & Recharts   │        │  - Jaccard Similarity (UVP 2)     │
│  - React Flow Dependency Map │        │  - Change Impact Propagator (UVP 3│
└──────────────────────────────┘        └─────────────────┬─────────────────┘
                                                          │
                               ┌──────────────────────────┴────────┐
                               ▼                                   ▼
                ┌────────────────────────────┐    ┌──────────────────────────────────┐
                │ Primary: MongoDB 7.0       │    │ High-Reliability Fallback:       │
                │ - Mongoose ODM             │ OR │ Local Persistent Storage         │
                │ - Dynamic Indexing         │    │ - JSON-Backed File Store         │
                │                            │    │ - Zero External DB Dependency    │
                └────────────────────────────┘    └──────────────────────────────────┘
```

### Key Architectural Strengths for SIH Finalists:
1. **Single-Port Unified Service:** The Express server statically serves the compiled Vite React frontend (`client/dist`) and all `/api/*` endpoints from a single port (`PORT=5000`), eliminating CORS issues in production.
2. **Zero-Failure Database Fallback:** If MongoDB is unavailable or times out, CaseBridge instantly switches to **High-Reliability Local Storage** (`server/data/store.json`), allowing judges to evaluate all features without requiring local database setup.
3. **No External Paid AI APIs:** Deterministic, explainable natural language similarity and workload algorithms run 100% locally with zero latency, zero API costs, and zero rate limits.

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the unified server and client delivery |
| `NODE_ENV` | `production` | Enables production caching and disables development banners |
| `MONGO_URI` | `mongodb://localhost:27017/casebridge` | MongoDB connection URI (Optional: system falls back if unreachable) |
| `JWT_SECRET` | *(string)* | Secret key for hashing role-based JWT bearer tokens |
| `CLIENT_URL` | `http://localhost:5000` | Application public origin for CORS and redirects |
| `DEMO_MODE` | `true` | Automatically provisions seed data for SIH evaluation |

---

## 3. Quick Start (Local Production Run)

To run the full production application locally:

```bash
# 1. Install all dependencies across root, server, and client
npm run install:all

# 2. Build the optimized React frontend bundle
npm run build

# 3. Launch the unified application server
npm start
```

Open your browser to:
```
http://localhost:5000
```

---

## 4. Deployment Option A: Docker & Docker Compose (Recommended)

CaseBridge includes a multi-stage `Dockerfile` and a `docker-compose.yml` that orchestrates both the application and a dedicated MongoDB 7.0 container.

### Step 1: Launch with Docker Compose
```bash
docker compose up --build -d
```

### Step 2: Verify Running Containers
```bash
docker compose ps
```

### Step 3: Inspect Logs & Health
```bash
docker compose logs -f app
```

### Step 4: Access Application
- Web Application: `http://localhost:5000`
- API Health Status: `http://localhost:5000/api/health`
- MongoDB: `localhost:27017`

To stop:
```bash
docker compose down
```

---

## 5. Deployment Option B: Cloud PaaS (Render / Railway / Heroku)

### Deploying to Render (1-Click Blueprint)
1. Fork or push this repository to GitHub/GitLab.
2. Log in to [Render.com](https://render.com) and click **New > Blueprint**.
3. Connect your repository. Render automatically reads [render.yaml](file:///c:/SIH_26264/render.yaml).
4. Render will run:
   - Build Command: `npm run install:all && npm run build`
   - Start Command: `npm start`
5. Your portal will be live at `https://casebridge-aicte.onrender.com`.

### Deploying to Railway
1. Go to [Railway.app](https://railway.app) and create a **New Project from GitHub Repo**.
2. Railway detects Node.js and executes the root `Procfile` (`web: node server/index.js`).
3. Add environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET=your_secure_random_key`
   - `DEMO_MODE=true`
4. Add a MongoDB plugin with one click if you want live MongoDB; otherwise the system automatically runs in local persistent storage mode.

---

## 6. Deployment Option C: Linux Virtual Machine (AWS EC2 / DigitalOcean / Ubuntu)

For self-hosted deployments on an Ubuntu 22.04 LTS or Debian cloud server:

### Step 1: Install Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
```

### Step 2: Clone & Build CaseBridge
```bash
git clone https://github.com/<your-org>/CaseBridge.git /var/www/casebridge
cd /var/www/casebridge
cp .env.example .env

# Install dependencies and build frontend
npm run install:all
npm run build
```

### Step 3: Run with PM2 Process Manager
```bash
pm2 start server/index.js --name "casebridge"
pm2 save
pm2 startup
```

### Step 4: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/casebridge`:

```nginx
server {
    listen 80;
    server_name casebridge.yourdomain.gov.in;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/casebridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Pre-Configured Demo Credentials for Evaluation

Evaluators can switch between personas directly using the **"Switch Persona (Demo)"** selector in the top navbar, or log in manually:

| Persona / Officer | Role | Bureau / Department | Email | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| **Dr. Rajeshwar Sharma** | Administrator | Member Secretary / Administration | `admin@aicte.gov.in` | `admin123` |
| **Dr. Ananya Sen** | Bureau Official | Regulation Bureau (RB) | `ananya.sen@aicte.gov.in` | `official123` |
| **Shri Vikramaditya Rao**| Bureau Official | Public Grievance Redressal (PGRC) | `v.rao@aicte.gov.in` | `official123` |
| **Dr. Manisha Mukherjee**| Senior Officer | Central Oversight / Higher Education | `manisha.m@aicte.gov.in` | `senior123` |

---

## 8. Verification & Health Monitoring

Execute automated health and test suites to verify that the deployed system is operating correctly:

```bash
# 1. Verify all 5 core UVP workflows (Auto-Assign, Groups, Impact, Audit)
npm test

# 2. Verify all REST API endpoints and static SPA delivery
npm run test:http

# 3. Run complete end-to-end verification suite
npm run verify
```

### Health Check Endpoint
Query the live operational health status at any time:
```bash
curl http://localhost:5000/api/health
```

Sample Response:
```json
{
  "status": "ONLINE",
  "project": "CaseBridge — AICTE Institution Complaint Monitoring & Coordination System",
  "edition": "Smart India Hackathon 2026 (SIH26264)",
  "dbMode": "local_memory",
  "nodeEnv": "production",
  "uptime": 1420,
  "timestamp": "2026-10-24T11:45:00.000Z"
}
```

---

## 9. Resetting Evaluation Seed Data

If data is modified during demonstration testing and needs to be returned to the pristine initial state:
1. In the Web UI: Click the **"Reset Seed Data"** button in the top navbar.
2. Via CLI:
   ```bash
   npm run seed
   ```
3. Via API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/reset-demo
   ```
This restores all 28 institutions, cases, issue groups, and official workload limits.
