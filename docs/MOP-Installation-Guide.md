# J.A.R.G.I.I.N. v1.1.0 — Method of Procedure (MOP)

## Installation Guide: Azure Cloud & QNAP NAS Deployment

**Just A Really Great Intelligent Integrated Non-human**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option A: Azure Deployment](#option-a-azure-deployment)
3. [Option B: QNAP NAS Deployment](#option-b-qnap-nas-deployment)
4. [Post-Installation Configuration](#post-installation-configuration)
5. [Entra ID Setup](#entra-id-setup)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Common Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | v20.19+ |
| npm | v10+ |
| RAM | 1GB minimum, 2GB recommended |
| Disk | 500MB for app + dependencies |
| Network | HTTPS (port 443), outbound to Microsoft Graph API |

### Source Files

```
jargiin-assistant/
├── packages/backend/    # Fastify API server (port 3001)
├── packages/frontend/   # React PWA (static files after build)
├── package.json         # Root workspace
└── .env.example         # Environment variable template
```

---

## Option A: Azure Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Azure Resource Group: rg-jargiin                       │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Azure Static │    │ Azure App Service (Linux)     │  │
│  │ Web Apps     │───▶│ Node.js 20 LTS               │  │
│  │ (Frontend)   │    │ packages/backend              │  │
│  └──────────────┘    └──────────────────────────────┘  │
│         │                        │                      │
│         ▼                        ▼                      │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Azure CDN    │    │ Entra ID (Authentication)    │  │
│  │ (Optional)   │    │ Microsoft Graph API          │  │
│  └──────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Step 1: Create Azure Resources

```bash
# Login to Azure CLI
az login

# Create resource group
az group create --name rg-jargiin --location eastus

# Create App Service Plan (Linux, B1 tier minimum)
az appservice plan create \
  --name plan-jargiin \
  --resource-group rg-jargiin \
  --sku B1 \
  --is-linux

# Create Web App for backend
az webapp create \
  --name jargiin-backend \
  --resource-group rg-jargiin \
  --plan plan-jargiin \
  --runtime "NODE:20-lts"

# Create Static Web App for frontend
az staticwebapp create \
  --name jargiin-frontend \
  --resource-group rg-jargiin \
  --location eastus2
```

### Step 2: Configure Backend App Service

```bash
# Set Node.js startup command
az webapp config set \
  --name jargiin-backend \
  --resource-group rg-jargiin \
  --startup-file "node packages/backend/dist/index.js"

# Set environment variables
az webapp config appsettings set \
  --name jargiin-backend \
  --resource-group rg-jargiin \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    ENTRA_CLIENT_ID="<your-client-id>" \
    ENTRA_TENANT_ID="<your-tenant-id>" \
    ENTRA_CLIENT_SECRET="<your-client-secret>" \
    CORS_ORIGIN="https://jargiin-frontend.azurestaticapps.net"
```

### Step 3: Deploy Backend

```bash
# From project root
cd packages/backend

# Build
npm run build

# Create deployment package
zip -r ../backend-deploy.zip dist/ package.json node_modules/

# Deploy
az webapp deploy \
  --name jargiin-backend \
  --resource-group rg-jargiin \
  --src-path ../backend-deploy.zip \
  --type zip
```

### Step 4: Deploy Frontend

```bash
# From project root
cd packages/frontend

# Build (produces dist/ folder)
npm run build

# Deploy to Static Web Apps
# Option 1: GitHub Actions (recommended — auto-deploys on push)
# Option 2: CLI deployment
npx @azure/static-web-apps-cli deploy ./dist \
  --app-name jargiin-frontend \
  --env production
```

**Static Web App Configuration** — create `packages/frontend/staticwebapp.config.json`:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  },
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "https://jargiin-backend.azurewebsites.net/*"
    }
  ]
}
```

### Step 5: Configure Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name jargiin-backend \
  --resource-group rg-jargiin \
  --hostname api.yourdomain.com

# Enable managed certificate
az webapp config ssl create \
  --name jargiin-backend \
  --resource-group rg-jargiin \
  --hostname api.yourdomain.com
```

### Azure Cost Estimate

| Resource | SKU | Est. Monthly |
|----------|-----|-------------|
| App Service Plan | B1 | ~$13 |
| Static Web Apps | Free tier | $0 |
| Entra ID | Free tier | $0 |
| Total | | ~$13/month |

---

## Option B: QNAP NAS Deployment

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  QNAP NAS                                              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Container Station (Docker)                        │  │
│  │                                                   │  │
│  │  ┌─────────────┐   ┌────────────────────────┐   │  │
│  │  │ nginx:alpine│   │ node:20-slim           │   │  │
│  │  │ (Frontend)  │──▶│ (Backend API)          │   │  │
│  │  │ Port 8080   │   │ Port 3001              │   │  │
│  │  └─────────────┘   └────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Shared Folder: /share/JARGIIN/                         │
└─────────────────────────────────────────────────────────┘
```

### Prerequisites (QNAP)

1. **QTS 5.0+** or **QuTS hero**
2. **Container Station** installed from App Center
3. **4GB+ RAM** allocated to containers
4. Recommended NAS models: TS-x53D, TS-x64, TS-h886, or newer

### Step 1: Prepare NAS Storage

Via QNAP File Station or SSH:

```bash
# SSH into QNAP
ssh admin@<nas-ip>

# Create application directory
mkdir -p /share/JARGIIN/app/backend
mkdir -p /share/JARGIIN/app/frontend
mkdir -p /share/JARGIIN/data
mkdir -p /share/JARGIIN/config
```

### Step 2: Create Docker Compose File

Save as `/share/JARGIIN/docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: node:20-slim
    container_name: jargiin-backend
    working_dir: /app
    volumes:
      - ./app/backend:/app
      - ./data:/app/data
      - ./config/.env:/app/.env:ro
    environment:
      - NODE_ENV=production
      - PORT=3001
    ports:
      - "3001:3001"
    command: ["node", "dist/index.js"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: nginx:alpine
    container_name: jargiin-frontend
    volumes:
      - ./app/frontend/dist:/usr/share/nginx/html:ro
      - ./config/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "8080:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

networks:
  default:
    name: jargiin-network
```

### Step 3: Create Nginx Config

Save as `/share/JARGIIN/config/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

### Step 4: Create Environment Config

Save as `/share/JARGIIN/config/.env`:

```bash
# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Entra ID (fill in after Azure App Registration)
ENTRA_CLIENT_ID=
ENTRA_TENANT_ID=
ENTRA_CLIENT_SECRET=

# CORS (use your NAS IP or hostname)
CORS_ORIGIN=http://<nas-ip>:8080

# OneDrive App Folder
ONEDRIVE_APP_FOLDER=Apps/JARGIIN
```

### Step 5: Build & Transfer Files

On your development machine:

```bash
# Build both packages
npm run build

# Install production dependencies for backend
cd packages/backend
npm ci --omit=dev

# Create deployment archive
cd ../..
tar -czf jargiin-v1.1.0.tar.gz \
  packages/backend/dist/ \
  packages/backend/package.json \
  packages/backend/node_modules/ \
  packages/frontend/dist/

# Transfer to NAS
scp jargiin-v1.1.0.tar.gz admin@<nas-ip>:/share/JARGIIN/
```

On the QNAP NAS:

```bash
cd /share/JARGIIN

# Extract
tar -xzf jargiin-v1.1.0.tar.gz

# Move to correct locations
cp -r packages/backend/dist app/backend/
cp packages/backend/package.json app/backend/
cp -r packages/backend/node_modules app/backend/
cp -r packages/frontend/dist app/frontend/

# Clean up
rm -rf packages/ jargiin-v1.1.0.tar.gz
```

### Step 6: Launch via Container Station

**Option A: CLI (via SSH)**
```bash
cd /share/JARGIIN
docker-compose up -d
```

**Option B: QNAP Container Station UI**
1. Open Container Station from QTS desktop
2. Click **Create** → **Create Application**
3. Paste the `docker-compose.yml` content
4. Application name: `jargiin`
5. Click **Create**

### Step 7: Verify Deployment

```bash
# Check containers are running
docker ps | grep jargiin

# Test backend health
curl http://localhost:3001/health

# Test frontend
curl -s http://localhost:8080 | head -5
```

Access the app at: `http://<nas-ip>:8080`

---

## Post-Installation Configuration

### 1. Entra ID App Registration

Required for Microsoft 365 integration (OneDrive, Mail, Calendar, Teams).

1. Go to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations**
2. Click **New registration**
   - Name: `J.A.R.G.I.I.N.`
   - Supported accounts: **Single tenant** (recommended for personal use)
   - Redirect URI (Web): `https://your-domain/auth/callback`
3. Note the **Application (client) ID** and **Directory (tenant) ID**
4. Under **Certificates & secrets** → **New client secret** → copy the Value
5. Under **API permissions**, add Microsoft Graph permissions:
   - `User.Read` — Sign in and read user profile
   - `Mail.Read` — Read user mail
   - `Mail.Send` — Send mail as user
   - `Calendars.ReadWrite` — Read/write calendar
   - `Files.ReadWrite` — Read/write OneDrive files
   - `Chat.Read` — Read Teams messages
6. Click **Grant admin consent** (if you are tenant admin)

7. Update your deployment's environment variables with:
   - `ENTRA_CLIENT_ID` = Application (client) ID
   - `ENTRA_TENANT_ID` = Directory (tenant) ID
   - `ENTRA_CLIENT_SECRET` = Client secret value

### 2. HTTPS Setup

**Azure**: Handled automatically via App Service managed certificates.

**QNAP**:
- Option 1: Use QNAP's built-in **Reverse Proxy** (Control Panel → Network → Reverse Proxy)
- Option 2: Use **myQNAPcloud SSL** certificate (free with myQNAPcloud)
- Option 3: Let's Encrypt via Certbot:
```bash
docker run -it --rm \
  -v /share/JARGIIN/certs:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d jargiin.yourdomain.com
```

### 3. Remote Access (QNAP)

| Method | Security | Setup Difficulty |
|--------|----------|-----------------|
| Tailscale VPN | Excellent | Easy |
| WireGuard | Excellent | Medium |
| myQNAPcloud Link | Good | Easy (built-in) |
| Port Forwarding | Lower | Easy (not recommended) |

**Recommended**: Install Tailscale on your QNAP for zero-config secure remote access.

---

## Verification Checklist

| # | Check | Command / Action | Expected Result |
|---|-------|-----------------|-----------------|
| 1 | Backend health | `curl https://your-host/api/health` | `{"status":"ok","service":"J.A.R.G.I.I.N. backend"}` |
| 2 | Frontend loads | Visit `https://your-host/` in browser | HUD interface renders |
| 3 | Voice input | Click mic button, speak | Waveform displays, transcript appears |
| 4 | Boot mode | Type "open your boot" | Navigation menu appears |
| 5 | Close boot | Type "finite" | Menu hides |
| 6 | Web search | `curl https://your-host/api/search?q=test` | JSON search results |
| 7 | Research mode | Type "research quantum computing" | Research panel opens with budget |
| 8 | Analysis mode | Type "analyze climate data" | Analysis panel opens |
| 9 | Browser control | Type "search for weather" | Browser search executed |
| 10 | Personality | Open boot → Personality tab | Presets and voice library load |
| 11 | Entra ID | Sign in with Microsoft | User profile displayed |
| 12 | OneDrive | Upload/download a file | File appears in Apps/JARGIIN/ |

---

## Troubleshooting

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Backend won't start | Port 3001 in use | Change PORT in .env, update docker-compose |
| Frontend blank page | JS not loading | Check nginx config has SPA fallback |
| CORS errors in console | Origin mismatch | Update CORS_ORIGIN env var to match frontend URL |
| Entra ID 401 Unauthorized | Token expired or wrong config | Verify Client ID/Secret, re-authenticate |
| Container OOM killed | Insufficient RAM | Allocate ≥2GB to container in docker-compose |
| Search returns empty | Network restricted | Ensure outbound HTTPS to api.duckduckgo.com |
| Voice not working | No microphone permission | Grant browser mic access, ensure HTTPS |
| PWA not installing | Not served over HTTPS | Set up SSL certificate |

### Viewing Logs

**Azure:**
```bash
# Stream live logs
az webapp log tail --name jargiin-backend --resource-group rg-jargiin

# Download log files
az webapp log download --name jargiin-backend --resource-group rg-jargiin
```

**QNAP:**
```bash
# Backend logs
docker logs jargiin-backend --tail 100 -f

# Frontend/nginx logs
docker logs jargiin-frontend --tail 100 -f

# Check container resource usage
docker stats jargiin-backend jargiin-frontend
```

### Performance Tuning (QNAP)

For NAS models with limited CPU, add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## Update Procedure

### Azure

```bash
# Build new version
npm run build

# Deploy backend
cd packages/backend
zip -r ../backend-deploy.zip dist/ package.json node_modules/
az webapp deploy --name jargiin-backend --resource-group rg-jargiin \
  --src-path ../backend-deploy.zip --type zip

# Deploy frontend
npx @azure/static-web-apps-cli deploy ./packages/frontend/dist \
  --app-name jargiin-frontend --env production
```

### QNAP

```bash
# On dev machine: build and transfer
npm run build
tar -czf jargiin-v1.x.x.tar.gz packages/backend/dist/ packages/backend/package.json packages/backend/node_modules/ packages/frontend/dist/
scp jargiin-v1.x.x.tar.gz admin@<nas-ip>:/share/JARGIIN/

# On NAS: extract and restart
ssh admin@<nas-ip>
cd /share/JARGIIN
tar -xzf jargiin-v1.x.x.tar.gz
cp -r packages/backend/dist/* app/backend/dist/
cp -r packages/frontend/dist/* app/frontend/dist/
rm -rf packages/

# Restart containers (zero-downtime with rolling restart)
docker-compose restart backend
docker-compose restart frontend
```

---

## Backup Strategy (QNAP)

Add to QNAP's **Hybrid Backup Sync**:
- Source: `/share/JARGIIN/data/` and `/share/JARGIIN/config/`
- Destination: OneDrive, Azure Blob, or another NAS
- Schedule: Daily incremental

---

*Document Version: 1.1.0 | Created: July 2026 | Author: J.A.R.G.I.I.N. Build System*
