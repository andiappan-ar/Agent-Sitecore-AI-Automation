# Environment Report — Local Docker — 2026-03-28

## Connection

| Item | Value |
|---|---|
| Environment | Local Docker |
| CM Host | https://xmcloudcm.localhost |
| Authenticated User | sitecore\andiappan.ravi@omnia.ae |
| Is Administrator | Yes |
| CLI | Connected (ref: xmcloud, env: default) |
| Authoring GraphQL | Working (Bearer token) |
| Edge GraphQL | Working (API key) |

---

## Content Tree

```
/sitecore/content/
└── Home (110d559fdea542ea9c1c8a5df7e70ef9)
    Template: Sample Item
    Has Children: No
```

**Assessment:** This is a **fresh/default Sitecore instance**. No tenant or site collection has been created yet. Only the default `Home` item exists with a `Sample Item` template.

---

## Sites

| Site | Root Path | Start Path | Language | Domain |
|---|---|---|---|---|
| website | /sitecore/content | /home | en | extranet |

Only the default `website` site exists. No SXA sites have been configured.

---

## Site Collections

No site collections found. This confirms no SXA tenant/site structure has been set up.

---

## Templates

| Location | Items |
|---|---|
| /sitecore/templates/Project | **Empty** — no project templates |
| /sitecore/templates/Foundation | (not scanned — system templates) |
| /sitecore/templates/Feature | (not scanned — SXA module templates) |

**Assessment:** No custom templates exist. The environment is stock.

---

## Renderings

| Location | Items |
|---|---|
| /sitecore/layout/Renderings/Project | **Empty** — no project renderings |

**Assessment:** No custom renderings registered.

---

## Media Library

| Location | Items |
|---|---|
| /sitecore/media library/Project | **Empty** — no project media |

---

## System Configuration

### Rendering Hosts
| Name | ID |
|---|---|
| Default | dffee92b044145a4920767810b72bd46 |

### API Keys
| Name | ID |
|---|---|
| App-Starter | c81b907a1d1645d49d800219de9ec9ee |

### Languages
| Language | Display Name |
|---|---|
| en | English : English |

### Workflows
| Workflow | ID | States |
|---|---|---|
| Basic Datasource Workflow | {A053ED9F-4099-4682-9411-2B4C98E481E4} | Draft → Approved |
| Basic Workflow | {B4F49B23-4BBA-4C79-BA22-F89F5F0D4E4F} | Draft → Approved |
| JSS Development Workflow | {6C59AE29-D0A1-4B77-9305-0ABAB21D5FE5} | Development Mode → Content Mode → Published |
| Sample Webhook Workflow | {C9892497-0D1B-4A3F-B47C-62AB8B5AAFD7} | Draft → Awaiting Approval → Approved |
| Sample Workflow | {A5BC37E7-ED96-4C1E-8590-A26E64DB55EA} | Draft → Awaiting Approval → Approved |

---

## Overall Assessment

This is a **clean, default SitecoreAI / XM Cloud local instance** with:
- No SXA site collections or sites configured
- No custom templates, renderings, or media
- Default `website` site pointing to `/sitecore/content/Home`
- 1 rendering host (Default), 1 API key (App-Starter)
- 1 language (English), 5 default workflows
- Admin access fully working via CLI and GraphQL

### Ready For
- Creating a new SXA Site Collection and Site
- Setting up project templates and renderings
- Building content structure from scratch
- Full automation workflow testing

### Key IDs for Automation
| Item | GUID |
|---|---|
| Content root | 0de95ae441ab4d019eb067441b7c2450 |
| Home item | 110d559fdea542ea9c1c8a5df7e70ef9 |
| Project templates folder | 825b30b4b40b422e992023a1b6bda89c |
| Project renderings folder | 1995806f0a8442b593b088f0e2ff872c |
| Project media folder | 90ae357f61714ea9808c5600b678f726 |
| Default rendering host | dffee92b044145a4920767810b72bd46 |
| App-Starter API key | c81b907a1d1645d49d800219de9ec9ee |
