# Sitecore AI Automation — Prerequisites & Setup Guide

This guide sets up everything needed for the automation skills to work. Follow this on any fresh machine or when cloning the repo to a new environment.

---

## Prerequisites

### System Requirements

| Requirement | Details |
|---|---|
| **OS** | Windows 10/11 Pro or Enterprise |
| **Docker Desktop** | v4.18+ with **Windows Containers** mode |
| **Windows Features** | Hyper-V + Containers enabled |
| **Node.js** | LTS (v22+) |
| **.NET 8+** | For Sitecore CLI |
| **Sitecore License** | Valid `license.xml` file |
| **Sitecore Cloud Account** | Org account with SitecoreAI access |
| **RAM** | 16 GB minimum (32 GB recommended) |
| **Disk** | 30 GB free, SSD recommended |

### Enable Windows Features (one-time, requires restart)
```powershell
# Run in Admin PowerShell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
Enable-WindowsOptionalFeature -Online -FeatureName Containers -All
# Restart when prompted
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/Sitecore/xmcloud-starter-js.git xmcloud
```

---

## Step 2: Pre-Flight Checks (run EVERY TIME before starting containers)

```powershell
# Run in Admin PowerShell

# 1. Stop IIS (conflicts with port 443)
Stop-Service W3SVC -Force -ErrorAction SilentlyContinue
Stop-Service WAS -Force -ErrorAction SilentlyContinue

# 2. Stop local Solr/Java (conflicts with port 8984)
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Verify Docker is in Windows Containers mode
docker info | Select-String "OSType"
# Must show: OSType: windows
# If not: right-click Docker Desktop tray icon → "Switch to Windows containers..."

# 4. Verify required ports are free
$ports = @(443, 8079, 8984, 14330)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Write-Host "PORT $p IN USE by PID $($conn.OwningProcess)" -ForegroundColor Red }
    else { Write-Host "PORT $p free" -ForegroundColor Green }
}
```

---

## Step 3: Initialize the Environment (first time only)

```powershell
# Run in Admin PowerShell from repo root
cd xmcloud
./local-containers/scripts/init.ps1 -InitEnv -LicenseXmlPath "C:\License\license.xml" -AdminPassword "YourAdminPassword"
```

This will:
- Install SitecoreDockerTools PowerShell module
- Generate TLS certificates via mkcert
- Add hosts file entries (`xmcloudcm.localhost`, `nextjs.xmc-starter-js.localhost`)
- Populate `.env` with passwords, keys, connection strings

After init, set the CA cert for Node.js:
```powershell
setx NODE_EXTRA_CA_CERTS "C:\Users\<YOUR_USER>\AppData\Local\mkcert\rootCA.pem"
# Restart terminal for it to take effect
```

---

## Step 4: Start Docker Containers

### Known Issue: Windows 11 HNS Port Mapping Bug (0x20)

On Windows 11 (especially build 26100+), `docker compose up` may fail with:
```
hnsCall failed in Win32: The process cannot access the file (0x20)
```

**Workaround:** Remove all `ports:` sections from `docker-compose.yml` and use `netsh portproxy` instead. See "Port Forwarding Workaround" below.

### Start containers
```powershell
cd xmcloud/local-containers
docker compose up -d
```

### Verify all services are healthy
```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

Expected healthy services: `mssql`, `solr`, `cm`, `traefik`

### Port Forwarding Workaround (if HNS bug applies)

If ports are commented out in docker-compose.yml:
```powershell
# Run in Admin PowerShell
# Get Traefik container IP
$traefikIp = docker inspect xmcloud-starter-js-traefik-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Forward port 443 to Traefik
netsh interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=443 connectaddress=$traefikIp

# To remove later:
# netsh interface portproxy delete v4tov4 listenport=443 listenaddress=127.0.0.1
```

---

## Step 5: Sitecore CLI Setup

### Restore CLI tools
```powershell
cd xmcloud
dotnet tool restore
```

### Login to Sitecore Cloud
```powershell
dotnet sitecore cloud login
# Browser opens → enter code → authorize with your ORG account
```

### Connect CLI to local CM
```powershell
dotnet sitecore connect --ref xmcloud --cm https://xmcloudcm.localhost --allow-write true -n default
```

### Initialize indexes and content
```powershell
dotnet sitecore index schema-populate
dotnet sitecore index rebuild
dotnet sitecore ser push -i nextjs-starter
```

### Push API key
```powershell
# Get the API key from .env
$apiKey = (Get-Content local-containers/.env | Select-String "SITECORE_API_KEY_APP_STARTER=").ToString().Split("=")[1]

# Push it
.\local-containers\docker\build\cm\templates\import-templates.ps1 -RenderingSiteName "App-Starter" -SitecoreApiKey $apiKey
```

### Restart rendering host
```powershell
cd local-containers
docker compose restart rendering-nextjs
```

---

## Step 6: Verify Access Points

| Service | URL | Credentials |
|---|---|---|
| **Sitecore CM** | https://xmcloudcm.localhost/sitecore | `admin` / `<your AdminPassword>` |
| **Solr Admin** | http://localhost:8984 (or via container IP) | — |
| **SQL Server** | localhost:14330 | `sa` / `<from .env>` |
| **Page Builder** | https://pages.sitecorecloud.io | Sitecore Cloud org account |

### Connect Page Builder to local CM
1. Open https://pages.sitecorecloud.io
2. DevTools (F12) → Application → Local Storage → `https://pages.sitecorecloud.io`
3. Add key: `Sitecore.Pages.LocalXmCloudUrl` = `https://xmcloudcm.localhost/`
4. Refresh

---

## Step 7: Authoring GraphQL Setup

The Authoring GraphQL API enables live read/write operations — the foundation for automation skills.

**Endpoint:** `https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1`

### Authentication (for local CM)
Local CM uses the Sitecore Identity Server. For automation, use client credentials:

```
POST https://auth.sitecorecloud.io/oauth/token
Content-Type: application/json

{
  "client_id": "<from SitecoreAI Deploy Portal>",
  "client_secret": "<from SitecoreAI Deploy Portal>",
  "audience": "https://api.sitecorecloud.io",
  "grant_type": "client_credentials"
}
```

Get client credentials from: **SitecoreAI Deploy Portal → Project → Environment → Developer Settings**

### Test query
```bash
curl -k -X POST https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ item(path: \"/sitecore/content\") { id name } }"}'
```

---

## Stopping the Environment

```powershell
cd xmcloud/local-containers
docker compose down

# If using portproxy, clean up:
netsh interface portproxy delete v4tov4 listenport=443 listenaddress=127.0.0.1
```

---

## Quick Reference: Daily Workflow

```powershell
# 1. Pre-flight (Admin PowerShell)
Stop-Service W3SVC,WAS -Force -ErrorAction SilentlyContinue
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Start
cd xmcloud/local-containers
docker compose up -d

# 3. Wait for healthy (check every 30s)
docker ps -a --format "table {{.Names}}\t{{.Status}}"

# 4. Port forward if needed (Admin PowerShell)
$ip = docker inspect xmcloud-starter-js-traefik-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
netsh interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=443 connectaddress=$ip

# 5. Work at https://xmcloudcm.localhost/sitecore
```
