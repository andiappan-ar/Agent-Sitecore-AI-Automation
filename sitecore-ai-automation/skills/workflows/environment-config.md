# Environment Config — Workflow Skill

## Purpose
Detect, collect, and persist environment connection details so every future run knows where to connect without asking again.

---

## Config File

All environment details are stored in:

```
sitecore-ai-automation/config/environments.json
```

This file is **dynamic** — generated on first run, updated when environments change. It is NOT committed to the Sitecore repo (lives in our automation folder).

---

## Schema

```json
{
  "activeEnvironment": "local-docker",
  "environments": {
    "local-docker": {
      "type": "local-docker",
      "name": "Local Docker Dev",
      "cmHost": "https://xmcloudcm.localhost",
      "authoringApi": "https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1",
      "edgeApi": "https://xmcloudcm.localhost/sitecore/api/graph/edge",
      "repoRoot": "d:/ARC/AI/Sitecore AI local/xmcloud",
      "tokenSource": "user.json",
      "userJsonPath": "d:/ARC/AI/Sitecore AI local/xmcloud/.sitecore/user.json",
      "apiKey": "c81b907a-1d16-45d4-9d80-0219de9ec9ee",
      "adminPassword": "SitecoreAdmin123!",
      "curlFlags": "-k",
      "lastConnected": "2026-03-28T10:58:50Z",
      "lastUser": "sitecore\\andiappan.ravi@omnia.ae",
      "isAdmin": true,
      "discoveryDate": "2026-03-28",
      "discoveryPath": "exports/local-docker/2026-03-28"
    },
    "xm-cloud-prod": {
      "type": "xm-cloud",
      "name": "XM Cloud Production",
      "cmHost": "https://<env-id>.sitecorecloud.io",
      "authoringApi": "https://authoring-api.sitecorecloud.io/api/graphql/v1",
      "edgeApi": "https://edge.sitecorecloud.io/api/graphql/v1",
      "repoRoot": "d:/ARC/AI/Sitecore AI local/xmcloud",
      "tokenSource": "oauth",
      "clientId": "<from deploy portal>",
      "clientSecret": "<from deploy portal>",
      "edgeApiKey": "<from deploy portal>",
      "curlFlags": "",
      "lastConnected": null,
      "lastUser": null,
      "isAdmin": null,
      "discoveryDate": null,
      "discoveryPath": null
    }
  }
}
```

---

## First Run Flow

When `environments.json` doesn't exist:

```
1. Check: Can I auto-detect?
   ├── Docker running with Sitecore containers? → pre-fill local-docker
   ├── .sitecore/user.json exists with host? → pre-fill from that
   └── Neither? → ask user

2. Ask user to confirm/provide:
   - Environment name (e.g. "local-docker", "staging", "prod")
   - Type: local-docker or xm-cloud
   - CM hostname
   - For xm-cloud: client ID, client secret, edge API key
   - For local-docker: repo root, admin password

3. Save to environments.json

4. Run preflight connect against saved config

5. Update config with:
   - lastConnected timestamp
   - lastUser (from currentUser query)
   - isAdmin flag
```

---

## Auto-Detection Logic

### Step 1: Check Docker
```bash
# Is Docker running with Sitecore CM?
CM_CONTAINER=$(docker ps --format "{{.Names}}" 2>/dev/null | grep "xmcloud.*cm" | head -1)
if [ -n "$CM_CONTAINER" ]; then
  TYPE="local-docker"
  CM_HOST="https://xmcloudcm.localhost"
fi
```

### Step 2: Check user.json
```bash
# Does .sitecore/user.json exist with a token?
USER_JSON=$(find . -path "*/.sitecore/user.json" -maxdepth 3 2>/dev/null | head -1)
if [ -n "$USER_JSON" ]; then
  TOKEN=$(node -e "const j=JSON.parse(require('fs').readFileSync('$USER_JSON','utf8'));console.log(j.endpoints?.xmCloud?.accessToken||'NONE')")
  HOST=$(node -e "const j=JSON.parse(require('fs').readFileSync('$USER_JSON','utf8'));console.log(j.endpoints?.xmCloud?.host||'NONE')")
fi
```

### Step 3: Check .env for API key
```bash
# Local Docker: get API key from .env
API_KEY=$(grep "SITECORE_API_KEY_APP_STARTER=" local-containers/.env 2>/dev/null | cut -d= -f2)
```

### Step 4: Check admin password from .env
```bash
ADMIN_PWD=$(grep "SITECORE_ADMIN_PASSWORD=" local-containers/.env 2>/dev/null | cut -d= -f2)
```

---

## Subsequent Runs

When `environments.json` exists:

```
1. Read activeEnvironment
2. Load that environment's config
3. Run preflight with saved details:
   - Token still valid? → proceed
   - Token expired? → refresh (cloud login or oauth)
   - CM unreachable? → check Docker / network
4. Update lastConnected timestamp
5. Hand off to requested task
```

---

## Switching Environments

```
User: "switch to production"
→ Set activeEnvironment = "xm-cloud-prod"
→ Run preflight against that config
→ If first time, run discovery and save discoveryDate/discoveryPath

User: "add new environment"
→ Collect details (ask or auto-detect)
→ Add to environments.json
→ Set as active
→ Run preflight + discovery
```

---

## What Gets Stored vs What Doesn't

### Stored in environments.json
- Hostnames, endpoints, API keys
- Repo paths, token source locations
- Last connection metadata
- Discovery snapshot paths

### NOT stored (security)
- Bearer tokens (read live from user.json each time)
- Client secrets for cloud (prompted or from env vars)
- Passwords (read from .env each time)

### Why not store tokens?
Tokens expire (24h). Reading fresh from `user.json` or OAuth each time is more reliable than caching a stale token.

---

## Related Skills
- [Preflight](preflight.md) — Reads this config, runs connectivity checks
- [CLI Commands](../access/cli-commands.md) — How to authenticate per environment
- [Environment Discovery](environment-discovery.md) — Populates discovery fields in config
