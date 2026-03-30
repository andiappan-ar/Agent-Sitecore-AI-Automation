# Sitecore CLI — Access Skill

## Purpose
Authenticate and interact with Sitecore via the `dotnet sitecore` CLI. Primary tool for content serialization, index management, and environment connectivity.

---

## Two Environments

| | Local Docker | XM Cloud (Direct) |
|---|---|---|
| **CM Host** | `https://xmcloudcm.localhost` | `https://<env-id>.sitecorecloud.io` |
| **Auth** | `dotnet sitecore cloud login` (browser) | Same, or client credentials |
| **Connect** | `--cm https://xmcloudcm.localhost` | `--cm https://<env-id>.sitecorecloud.io` |
| **Prereqs** | Docker containers running | Internet access, cloud account |

---

## Local Docker Setup

### Prerequisites
| Requirement | Check Command |
|---|---|
| .NET 8+ | `dotnet --version` |
| Docker containers healthy | `docker ps` → cm, mssql, solr healthy |
| Sitecore Cloud org account | — |

### Step 1: Restore CLI tools
```powershell
cd <repo-root>    # e.g. d:\ARC\AI\Sitecore AI local\xmcloud
dotnet tool restore
# Installs sitecore.cli from .config/dotnet-tools.json
```

### Step 2: Install CLI plugins
```powershell
dotnet sitecore --help | Out-Null
# First run triggers plugin installation
```

### Step 3: Cloud login (browser auth)
```powershell
dotnet sitecore cloud login
```
- Shows a **User Code** and **URL**
- Open URL in browser, enter code, authorize
- Must use **org account** (not personal)
- Token saved to `.sitecore/user.json`
- Token expires after ~24 hours

### Step 4: Connect CLI to local CM
```powershell
dotnet sitecore connect --ref xmcloud --cm https://xmcloudcm.localhost --allow-write true -n default
# Expected: "Environment 'default' has been connected to 'xmcloud' environment"
```

### Verify connection
```powershell
dotnet sitecore ser info
# Should return module info, not errors
```

---

## XM Cloud (Direct) Setup

### Prerequisites
| Requirement | Check Command |
|---|---|
| .NET 8+ | `dotnet --version` |
| Sitecore Cloud org account | Portal access |
| Internet access | — |

### Step 1-2: Same as local (restore + plugins)

### Step 3: Cloud login
```powershell
dotnet sitecore cloud login
# Same browser auth flow
```

Or with client credentials (non-interactive):
```powershell
dotnet sitecore cloud login `
  --client-id <CLIENT_ID> `
  --client-secret <CLIENT_SECRET> `
  --client-credentials true
```

### Step 4: Connect to cloud CM
```powershell
dotnet sitecore connect --ref xmcloud --cm https://<env-id>.sitecorecloud.io --allow-write true -n default
```

Get the CM hostname from: **Deploy Portal → Environment → Details → CM URL**

---

## Token Management

The bearer token is stored in `.sitecore/user.json`:

```json
{
  "endpoints": {
    "xmCloud": {
      "accessToken": "eyJhbGci...",
      "expiresIn": 86400
    }
  }
}
```

### Extract token (for GraphQL API use)
```powershell
# PowerShell
$token = (Get-Content ".sitecore/user.json" | ConvertFrom-Json).endpoints.xmCloud.accessToken
```

```bash
# Bash
TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('.sitecore/user.json','utf8'));console.log(j.endpoints.xmCloud.accessToken)")
```

### Refresh expired token
```powershell
dotnet sitecore cloud login
# Re-authenticates and updates user.json
```

---

## Content Serialization Commands

| Command | Purpose |
|---|---|
| `dotnet sitecore ser pull` | Pull items from CM → local YML |
| `dotnet sitecore ser push` | Push local YML → CM |
| `dotnet sitecore ser push -i <module>` | Push specific module only |
| `dotnet sitecore ser diff` | Compare local vs remote |
| `dotnet sitecore ser info` | Inspect serialization state |

### Serialization config files
- `sitecore.json` — Root config, lists modules
- `*.module.json` — Per-module include/exclude rules
- Output: YML files in `authoring/` directory

### Export full content tree
```powershell
dotnet sitecore ser pull
# YML files land in authoring/ per module config
```

### Push changes
```powershell
dotnet sitecore ser diff    # Preview changes
dotnet sitecore ser push    # Push all modules
```

---

## Index Management

```powershell
# Populate Solr schema (required before first rebuild)
dotnet sitecore index schema-populate

# Rebuild all indexes
dotnet sitecore index rebuild
```

---

## API Key Deployment (Local Docker only)

The rendering host needs a Sitecore API key registered in the CM:

```powershell
# Get API key from .env
$apiKey = (Get-Content local-containers/.env | Select-String "SITECORE_API_KEY_APP_STARTER=").ToString().Split("=")[1]

# Push via import-templates script
.\local-containers\docker\build\cm\templates\import-templates.ps1 `
  -RenderingSiteName "App-Starter" `
  -SitecoreApiKey $apiKey
```

---

## Full Setup Sequence

### Local Docker (after containers are running)
```powershell
# 1. CLI setup
dotnet tool restore
dotnet sitecore cloud login              # browser auth

# 2. Connect
dotnet sitecore connect --ref xmcloud --cm https://xmcloudcm.localhost --allow-write true -n default

# 3. Initialize
dotnet sitecore index schema-populate
dotnet sitecore index rebuild
dotnet sitecore ser push -i nextjs-starter

# 4. API key
$apiKey = (Get-Content local-containers/.env | Select-String "SITECORE_API_KEY_APP_STARTER=").ToString().Split("=")[1]
.\local-containers\docker\build\cm\templates\import-templates.ps1 -RenderingSiteName "App-Starter" -SitecoreApiKey $apiKey

# 5. Restart rendering
cd local-containers && docker compose restart rendering-nextjs
```

### XM Cloud (Direct)
```powershell
# 1. CLI setup
dotnet tool restore
dotnet sitecore cloud login

# 2. Connect
dotnet sitecore connect --ref xmcloud --cm https://<env-id>.sitecorecloud.io --allow-write true -n default

# 3. Push content (if needed)
dotnet sitecore ser push
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Reference environment 'xmcloud' doesn't exist` | CLI not connected | Run `dotnet sitecore connect --ref xmcloud ...` |
| `Forbidden` | Token expired | Run `dotnet sitecore cloud login` |
| `Unable to connect to remote server` | CM not running | Check `docker ps`, restart containers |
| `Provided SSC API keyData is not valid` | API key not deployed | Run `import-templates.ps1` |
| `Invalid or expired user code` | Too slow entering code | Run login again, enter code immediately |

---

## Related Skills
- [Authoring GraphQL](authoring-graphql.md) — Uses bearer token from `user.json`
- [Environment Discovery](../workflows/environment-discovery.md) — First workflow after connect
