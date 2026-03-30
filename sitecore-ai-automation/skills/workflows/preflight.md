# Preflight Check — Workflow Skill

## Purpose
**This runs BEFORE any Sitecore operation.** It detects the environment, verifies connectivity, authenticates if needed, and only then hands off to the requested workflow. Think of it as the tool's startup sequence.

---

## When to Use
**ALWAYS.** Before any Sitecore automation task — creating a site, updating content, querying templates — this preflight must pass. Never skip it. Never assume we're connected.

---

## Flowchart

```
User Request (e.g. "create a page", "list sites", "update content")
    │
    ▼
┌─────────────────────────────┐
│  Step 1: Detect Environment │
│  Is Docker running?         │
│  Is there a cloud config?   │
└─────────┬───────────────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
 LOCAL         CLOUD
    │            │
    ▼            ▼
┌───────────────────────────────┐
│  Step 2: Check Prerequisites  │
│  .NET? CLI restored? Ports?   │
└─────────┬─────────────────────┘
          │
          ▼
┌───────────────────────────────┐
│  Step 3: Check Connectivity   │
│  CM reachable? CLI connected? │
│  Token valid?                 │
└─────────┬─────────────────────┘
          │
     ┌────┴────┐
     ▼         ▼
  CONNECTED  NOT CONNECTED
     │         │
     │         ▼
     │    ┌──────────────────┐
     │    │ Step 4: Connect  │
     │    │ Login, connect,  │
     │    │ setup token      │
     │    └────────┬─────────┘
     │             │
     ▼             ▼
┌───────────────────────────────┐
│  Step 5: Verify GraphQL       │
│  Test authoring API query     │
└─────────┬─────────────────────┘
          │
     ┌────┴────┐
     ▼         ▼
   PASS       FAIL
     │         │
     │         ▼
     │       STOP → Report error,
     │              suggest fix
     ▼
┌───────────────────────────────┐
│  Step 6: Environment Summary  │
│  Report what we connected to  │
│  Hand off to requested task   │
└───────────────────────────────┘
```

---

## Step 1: Detect Environment

Run these checks in order. First match wins.

### Check 1A: Is Docker running with Sitecore containers?
```bash
docker ps --format "{{.Names}}" 2>/dev/null | grep -q "xmcloud.*cm"
```
- **Yes** → Environment = `LOCAL_DOCKER`
- **No** → Check 1B

### Check 1B: Is there a cloud environment configured?
```bash
# Check if user.json has a cloud endpoint
node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints?.xmCloud?.host||'NONE')"
```
- **Has host** → Environment = `XM_CLOUD`
- **NONE** → Check 1C

### Check 1C: Ask the user
If neither detected, ask:
> "I can't detect a running Sitecore environment. Are you working with:
> 1. Local Docker containers
> 2. XM Cloud (direct)
>
> For local Docker, I'll need containers running.
> For XM Cloud, I'll need your CM hostname."

### Set environment variables
```
LOCAL_DOCKER:
  CM_HOST=https://xmcloudcm.localhost
  AUTHORING_URL=https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1
  EDGE_URL=https://xmcloudcm.localhost/sitecore/api/graph/edge
  CURL_FLAGS="-k"  # skip SSL verify for local certs

XM_CLOUD:
  CM_HOST=https://<env-id>.sitecorecloud.io
  AUTHORING_URL=https://authoring-api.sitecorecloud.io/api/graphql/v1
  EDGE_URL=https://edge.sitecorecloud.io/api/graphql/v1
  CURL_FLAGS=""
```

---

## Step 2: Check Prerequisites

### For LOCAL_DOCKER:

| Check | Command | Fix if missing |
|---|---|---|
| Docker running | `docker info > /dev/null 2>&1` | Start Docker Desktop |
| Windows Containers mode | `docker info \| grep "OSType: windows"` | Switch to Windows containers |
| CM container healthy | `docker ps \| grep cm.*healthy` | `cd local-containers && docker compose up -d` |
| MSSQL healthy | `docker ps \| grep mssql.*healthy` | Same as above |
| Solr healthy | `docker ps \| grep solr.*healthy` | Same as above |
| IIS stopped | `powershell "Get-Service W3SVC"` → Stopped | `Stop-Service W3SVC,WAS -Force` |
| .NET installed | `dotnet --version` | Install .NET 8+ |
| CLI restored | `dotnet tool list \| grep sitecore.cli` | `dotnet tool restore` |

### For XM_CLOUD:

| Check | Command | Fix if missing |
|---|---|---|
| Internet access | `curl -s https://auth.sitecorecloud.io > /dev/null` | Check network |
| .NET installed | `dotnet --version` | Install .NET 8+ |
| CLI restored | `dotnet tool list \| grep sitecore.cli` | `dotnet tool restore` |

---

## Step 3: Check Connectivity

### Is CM reachable?
```bash
HTTP_CODE=$(curl $CURL_FLAGS -s -o /dev/null -w "%{http_code}" $CM_HOST/sitecore)
# 302 = reachable, anything else = problem
```

### Is CLI connected?
```bash
dotnet sitecore ser info 2>&1
# Success = connected, error = not connected
```

### Is token valid?
```bash
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints?.xmCloud?.accessToken||'NONE')")

# Test token against authoring API
curl $CURL_FLAGS -s -X POST "$AUTHORING_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentUser { name isAdministrator } }"}' | grep -q "name"
# Success = token valid
# AUTH_NOT_AUTHENTICATED = token expired
```

If all three pass → **Skip to Step 5**
If any fail → **Continue to Step 4**

---

## Step 4: Connect (only if Step 3 failed)

### 4A: CLI not restored
```powershell
dotnet tool restore
```

### 4B: Not logged in / token expired
```powershell
dotnet sitecore cloud login
# → Shows User Code and URL
# → User must open URL, enter code, authorize
# → Wait for confirmation
```

### 4C: CLI not connected to CM
**Local Docker:**
```powershell
dotnet sitecore connect --ref xmcloud --cm https://xmcloudcm.localhost --allow-write true -n default
```

**XM Cloud:**
```powershell
dotnet sitecore connect --ref xmcloud --cm https://<env-id>.sitecorecloud.io --allow-write true -n default
```

### 4D: Local Docker — containers not running

**CRITICAL: Stop IIS FIRST** — IIS binds port 443/80 and blocks Traefik (Docker reverse proxy). Sitecore containers will start but CM will be unreachable.

```powershell
# MUST DO FIRST — IIS blocks port 443
Stop-Service W3SVC,WAS -Force -ErrorAction SilentlyContinue
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

cd <repo-root>/local-containers
docker compose up -d

# Wait for healthy
do {
    Start-Sleep 30
    $cm = docker ps --format "{{.Status}}" --filter "name=cm"
} while ($cm -notmatch "healthy")
```

---

## Step 5: Verify GraphQL Access

### Test authoring API
```bash
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints.xmCloud.accessToken)")

RESULT=$(curl $CURL_FLAGS -s -X POST "$AUTHORING_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentUser { name isAdministrator } }"}')

echo $RESULT
# Must contain: "currentUser": { "name": "...", "isAdministrator": true/false }
```

### If authoring fails, test edge API as fallback
```bash
APIKEY=$(grep "SITECORE_API_KEY_APP_STARTER" local-containers/.env | cut -d= -f2)

curl $CURL_FLAGS -s -X POST "$EDGE_URL" \
  -H "sc_apikey: $APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ site { siteInfoCollection { name } } }"}'
```

### Fail conditions
If both APIs fail → **STOP**. Report:
- Which step failed
- The error message
- Suggested fix (re-login, restart containers, check network)

---

## Step 6: Environment Summary

After all checks pass, output:

```
╔══════════════════════════════════════╗
║  SITECORE AI AUTOMATION — CONNECTED ║
╠══════════════════════════════════════╣
║  Environment: LOCAL_DOCKER           ║
║  CM Host:     xmcloudcm.localhost    ║
║  Auth:        Bearer token (valid)   ║
║  Authoring:   ✓ Working              ║
║  Edge:        ✓ Working              ║
║  CLI:         ✓ Connected            ║
║  User:        sitecore\admin         ║
╚══════════════════════════════════════╝

Ready to proceed with: [user's original request]
```

Then hand off to the appropriate workflow skill.

---

## Decision Table: What to Run

After preflight passes, route to the correct skill:

| User Request | Skill |
|---|---|
| "discover", "what's in here", "map environment" | [environment-discovery.md](environment-discovery.md) |
| "create site", "add site" | `create-site.md` (TODO) |
| "create page", "add page type" | `create-page-type.md` (TODO) |
| "update content", "bulk update" | `bulk-content-update.md` (TODO) |
| "add component", "register rendering" | `component-registration.md` (TODO) |
| "upload media", "add images" | `media-management.md` (TODO) |
| "query", "find items", "search" | Use [authoring-graphql.md](../access/authoring-graphql.md) directly |

---

## Related Skills
- [CLI Commands](../access/cli-commands.md) — Auth setup per environment
- [Authoring GraphQL](../access/authoring-graphql.md) — API access per environment
- [Environment Discovery](environment-discovery.md) — First workflow after connect
