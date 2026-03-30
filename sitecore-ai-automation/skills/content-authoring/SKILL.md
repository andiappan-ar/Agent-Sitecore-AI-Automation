---
name: cbre-content-author
description: CBRE Global website content authoring — populate Sitecore pages with CBRE components, create datasource items, configure page layouts, and manage content for the CBRE XM Cloud site. Use when the user wants to create a new page, add components to a page, populate content, or manage the CBRE site structure.
argument-hint: page-path or task description
---

# CBRE Global Website — Content Authoring Skill

This skill helps create, populate, and manage content for the CBRE Global website running on Sitecore XM Cloud. It uses the existing CBRE component library to build pages by generating serialization YAMLs that can be pushed to Sitecore.

---

## Project Context

- **Site:** CBRE Global (`cbre-global`)
- **Rendering Host:** `kit-nextjs-product-listing`
- **Content Root:** `/sitecore/content/cbre/cbre-global/Home`
- **Serialization Path:** `authoring/items/items/templates/items/ccl.content.cbre.home/Home/`
- **Header Mode Default:** `transparent-light` (for home pages with dark hero images)

---

## Page Templates

| Template | ID | Use For |
|---|---|---|
| CCL Page | `ac9de9be-8e86-4147-8fbc-739d5560408b` | Standard pages (local serialization) |
| CBRE Page | `e67af66a-ed1c-4ab6-9e89-a625f4038154` | CBRE-specific pages (XM Cloud only) |
| Page (base) | `ad73ef66-efb0-4909-9741-52a8bfd32787` | Home page template |

---

## New Site Setup — Available Renderings

When setting up a new CBRE site, **two** Available Rendering groups are needed under `[Site]/Presentation/Available Renderings/`:

1. **`click-click-launch`** — Project-level renderings from the CCL starter kit. This is auto-created by SXA scaffolding when the site is created. Without this, NO components show in the editor.
2. **`CBRE`** — Custom CBRE component renderings. Must be created manually with the same rendering GUIDs as the global site.

**To add CBRE renderings to a new site:**
1. Create a YAML at `[site-renderings-folder]/Available Renderings/CBRE.yml`
2. Use template `76da0a8d-fc7e-42b2-af1e-205b49e43f98` (Available Renderings)
3. Set parent to the site's `Available Renderings` folder GUID
4. Copy the `Renderings` field value from the global CBRE site
5. Push with `dotnet sitecore ser push -n dev`

**Serialization module.json pattern for new regional sites (7 includes per site):**

> **Note:** Regional sites do NOT have a separate `/Data` module path — per-page datasources live under `Home/Data/` which is covered by `.home`. Only CBRE Global has a shared `/Data` folder at site level.

```json
{ "name": "ccl.content.[region].home", "path": "/sitecore/content/[collection]/[site]/Home" },
{ "name": "ccl.content.[region].renderings", "path": "/sitecore/content/[collection]/[site]/Presentation/Available Renderings" },
{ "name": "ccl.content.[region].partialdesigns", "path": "/sitecore/content/[collection]/[site]/Presentation/Partial Designs" },
{ "name": "ccl.content.[region].pagedesigns", "path": "/sitecore/content/[collection]/[site]/Presentation/Page Designs" },
{ "name": "ccl.content.[region].placeholders", "path": "/sitecore/content/[collection]/[site]/Presentation/Placeholder Settings" },
{ "name": "ccl.content.[region].settings", "path": "/sitecore/content/[collection]/[site]/Settings" },
{ "name": "ccl.templates.[region]", "path": "/sitecore/templates/Project/[region-collection]" }
```
All with `"allowedPushOperations": "CreateUpdateAndDelete"`.

### Partial Designs & Page Designs

Each site needs **Partial Designs** for shared header/footer and a **Default Page Design** that references them.

**Required items per site:**

```
[Site]/Presentation/
├── Partial Designs/
│   └── Global/                              ← Template: fcd9dd5e (Partial Design Folder, NOT common folder)
│       ├── CBREHeader.yml                   ← Template: fd2059fd (Partial Design)
│       │   Signature: cbreheader
│       │   __Renderings: CBREHeader in headless-header, datasource = {HEADER_DS_GUID}
│       └── CBREFooter.yml                   ← Template: fd2059fd (Partial Design)
│           Signature: cbrefooter
│           __Renderings: CBREFooter in headless-footer, datasource = {FOOTER_DS_GUID}
├── Page Designs/
│   └── Default.yml                          ← Template: 1105b8f8 (Page Design)
│       PartialDesigns: "{CBRE_HEADER_PARTIAL_ID}|{CBRE_FOOTER_PARTIAL_ID}"
└── Placeholder Settings/
    └── Partial Design/
        ├── CBREHeader.yml                   ← Template: d2a6884c, Placeholder Key: "sxa-cbreheader"
        └── CBREFooter.yml                   ← Template: d2a6884c, Placeholder Key: "sxa-cbrefooter"
```

**CRITICAL:** The Global folder must use template `fcd9dd5e` (Partial Design Folder), NOT `a87a00b1` (common folder).

**Partial Design datasource:** Points to the CBREHeader/CBREFooter datasource item GUID under `/Home/Data/`. Use absolute GUID reference `{GUID}`, not `local:/Data/...`.

**Page Design field on Home page:** Set `Page Design` (field ID: `24171bf1-c0e1-480e-be76-4c0a1876f916`) to the Default page design GUID.

### Existing Sites

| Site | Collection Path | Serialization Prefix | Template Path |
|---|---|---|---|
| CBRE Global | `/sitecore/content/cbre/cbre-global` | `ccl.content.cbre` | `/sitecore/templates/Project/click-click-launch` (shared) |
| CBRE UAE | `/sitecore/content/middle-east-and-africa/cbre-uae` | `ccl.content.uae` | `/sitecore/templates/Project/middle-east-and-africa` |
| CBRE Thailand | `/sitecore/content/asia-pacific/cbre-thailand` | `ccl.content.thailand` | `/sitecore/templates/Project/asia-pacific` |
| CBRE UK | `/sitecore/content/europe/cbre-uk` | `ccl.content.uk` | `/sitecore/templates/Project/europe` |

---

## Available Component Library

### Hero Components

| Component | Rendering ID | Template ID | Fields |
|---|---|---|---|
| CBREHeroSection | `0BB614EF-377B-47E2-9DDE-3BB50A869DC4` | `cfb0c00c-3af6-4c86-a20e-4219e1952964` | eyebrow, title, description, ctaLabel, ctaLink, image |
| CBREHeroSlideSection | `5BAA51A2-D2B8-4315-B4F6-E74C7EC006D5` | — | slides (Multilist → CBREHeroSlide children: title, description, ctaLabel, ctaLink, image) |
| CBREServicesHeroSection | `7FEEDE78-F3CA-4141-A6A7-484674D95370` | `eb0d1698-aba1-48b8-aa44-bfffaf9dc4f2` | title, description, ctaLabel, ctaLink, image |
| CBREOfficesPageHero | `D1E2F3A4-B5C6-4D7E-8F9A-0B1C2D3E4F5A` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | pageTitle, heroImage, searchPlaceholder |

### Content Sections

| Component | Rendering ID | Template ID | Fields |
|---|---|---|---|
| CBREAboutSection | `F2D882FE-9F9F-434C-B408-EAAC1CBB20FD` | `2c3d55be-4659-4cad-bf70-1d0e338f60e2` | bodyText, highlightText, ctaLabel, ctaLink |
| CBREWhatWeDoSection | `91B1A502-46B8-4DD8-AC14-6E4ED1AF7C25` | `f9f194a5-1326-4547-b512-9f55052358a7` | sectionTitle + 3 tiles × (category, title, description, ctaLabel, ctaLink) |
| CBREOurCommitmentSection | `064593F1-512C-4354-926F-F12B979AFDC9` | `8cdd20a6-b618-48b1-99c0-6d92185cbece` | sectionTitle + **up to 6 cards** × (title, description, ctaLabel, ctaLink) — grid auto-switches to 3-col when >4 cards |
| CBRELatestInsightsSection | `135D80C2-C973-4986-80EB-5F592A9A9414` | `2092ba4e-f5ed-4ad6-9d80-270b488a69e4` | sectionTitle + 3 cards × (categoryType, categoryRegion, title, date, description, ctaLabel, ctaLink, image) |
| CBREConnectWithExpert | `B1A8E41E-D725-4B4A-A23B-931A8B6F6994` | `c9d0e1f2-a3b4-5678-cdef-789012345678` | title, description, ctaLabel, ctaLink |

### Navigation & Layout

| Component | Rendering ID | Template ID | Fields |
|---|---|---|---|
| CBREHeader | `71A91774-5F4D-4568-AAE1-2CEEE0AEECAD` | `242f3954-b9af-49f3-8f62-9cb57c9c84fb` | logoDark, logoLight, logoLink, flagImage, primaryLinks (Multilist → HeaderLink) |
| CBREFooter | `AA6AE116-FEE7-4F0A-904C-7E0CA5DD0DC4` | `837ecf99-815f-4367-95d6-3ffee19171ab` | primaryLinks, secondaryLinks (Multilist → FooterLink), copyrightText |

### Supporting Components

| Component | Rendering ID | Template ID | Fields |
|---|---|---|---|
| CBREFeaturedArticles | `73D1939C-7889-4EEA-A200-5575EDC3FA15` | `12c34de8-77b4-4a78-ba3b-df552fa9c5e4` | 3 articles × (eyebrow, title, link) |
| CBREBannerStrip | `9AA53759-2BAB-4847-92CE-CAD055ABF5ED` | `ec5c2496-5d86-40c7-a0c7-63a6e07d8e68` | title, ctaLabel, ctaLink |
| CBRENewsletterSection | `6AAF45C4-C304-403B-8414-2650A6B3755C` | `827fa798-d2b1-46b4-aab8-d2953f18d913` | title, description, image, ctaLabel, ctaLink |

---

## Page Creation Workflow

### Step 1 — Create the Page YAML

Every new page needs a page YAML under the parent page folder:

```yaml
---
ID: "<new-guid>"
Parent: "<parent-page-guid>"
Template: "e67af66a-ed1c-4ab6-9e89-a625f4038154"
Path: "/sitecore/content/cbre/cbre-global/Home/[PageName]"
SharedFields:
- ID: "160bc458-9b25-4246-b179-0726c0f78c3d"
  Hint: headerMode
  Value: "transparent-light"
- ID: "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e"
  Hint: __Renderings
  Value: |
    <r xmlns:p="p" xmlns:s="s" p:p="1">
      <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
        [RENDERING ENTRIES GO HERE]
      </d>
    </r>
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "a4f985d9-98b3-4b52-aaaf-4344f6e747c6"
      Hint: __Workflow state
      Value: ""
```

### Step 2 — Create the Data Folder

```yaml
---
ID: "<new-guid>"
Parent: "<page-guid>"
Template: "a87a00b1-e6db-45ab-8b54-636fec3b5523"
Path: "/sitecore/content/cbre/cbre-global/Home/[PageName]/Data"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260317T120000Z
```

### Step 3 — Create Datasource Items

For each component on the page, create a datasource item under the Data folder.

**Example — CBREHeroSection datasource:**
```yaml
---
ID: "<new-guid>"
Parent: "<data-folder-guid>"
Template: "cfb0c00c-3af6-4c86-a20e-4219e1952964"
Path: "/sitecore/content/cbre/cbre-global/Home/[PageName]/Data/CBREHeroSection"
SharedFields:
- ID: "<eyebrow-field-guid>"
  Hint: eyebrow
  Value: "Market Report 2026"
- ID: "<title-field-guid>"
  Hint: title
  Value: "Commercial Real Estate Outlook"
- ID: "<description-field-guid>"
  Hint: description
  Value: "Expert analysis of market trends and opportunities."
- ID: "<ctaLabel-field-guid>"
  Hint: ctaLabel
  Value: "Read the Report"
- ID: "<ctaLink-field-guid>"
  Hint: ctaLink
  Value: |
    <link text="Read the Report" linktype="internal" id="{TARGET-GUID}" />
- ID: "<image-field-guid>"
  Hint: image
  Value: "<image mediaid='{MEDIA-ITEM-GUID}' />"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20260317T120000Z
```

### Step 4 — Add Rendering Entries to Page

Each component placed on the page needs a `<r>` entry in the `__Renderings` XML:

```xml
<r
  uid="{NEW-GUID}"
  s:ds="local:/Data/[DatasourceName]"
  s:id="{RENDERING-ID}"
  s:par=""
  s:ph="headless-main" />
```

**Ordering rules:**
- First component: `p:before="*"`
- Last component: `p:after="*[1=2]"`
- Middle components: `p:after="r[@uid='{PREVIOUS-UID}']"`

**Full example for a page with 3 components:**
```xml
<r xmlns:p="p" xmlns:s="s" p:p="1">
  <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
    <r uid="{UID-1}" p:before="*"
       s:ds="local:/Data/CBREHeroSlideSection"
       s:id="{5BAA51A2-D2B8-4315-B4F6-E74C7EC006D5}"
       s:ph="headless-main" />
    <r uid="{UID-2}" p:after="r[@uid='{UID-1}']"
       s:ds="local:/Data/CBREAboutSection"
       s:id="{F2D882FE-9F9F-434C-B408-EAAC1CBB20FD}"
       s:ph="headless-main" />
    <r uid="{UID-3}" p:after="*[1=2]"
       s:ds="local:/Data/CBREOurCommitSection"
       s:id="{064593F1-512C-4354-926F-F12B979AFDC9}"
       s:ph="headless-main" />
  </d>
</r>
```

---

## Header Mode Configuration

Set the `headerMode` field on the page to control header appearance:

| Value | Use When |
|---|---|
| `transparent-light` | Dark hero images (white logo/text over transparent bg) |
| `transparent-dark` | Light hero images (dark logo/text over transparent bg) |
| `dark` | Solid dark green header bar |
| `light` | Solid white header bar (inner pages) |

```yaml
SharedFields:
- ID: "160bc458-9b25-4246-b179-0726c0f78c3d"
  Hint: headerMode
  Value: "transparent-light"
```

---

## Content Reuse Patterns

### Reusing Header/Footer Across Pages

The CBREHeader and CBREFooter datasources are **per-page** (`local:/Data/CBREHeader`). To reuse the same header across pages:

**Option A: Copy the datasource** — duplicate the CBREHeader folder (with all child nav items) to the new page's Data folder. Quick but creates duplicate content.

**Option B: Reference shared datasource** — point to a shared path instead of `local:`:
```xml
s:ds="/sitecore/content/cbre/cbre-global/Home/Data/CBREHeader"
```
This references the Home page's header data from any page.

### Multilist Child Items (Hero Slides, Nav Links)

For components with Multilist fields (CBREHeroSlideSection, CBREHeader, CBREFooter), child items must be created under the datasource item:

```
Data/CBREHeroSlideSection/         ← parent datasource
  ├── Slide 1.yml                  ← child item (template: CBREHeroSlide)
  ├── Slide 2.yml
  └── Slide 3.yml
```

The parent's Multilist field references child GUIDs:
```yaml
- ID: "<slides-field-guid>"
  Hint: slides
  Value: |
    {SLIDE-1-GUID}
    {SLIDE-2-GUID}
    {SLIDE-3-GUID}
```

**CRITICAL: Two-step push required** — see sitecore-xm-cloud-content-sdk skill for details.

---

## Page Variants — Common Layouts

### Offices Listing Page Layout (UAE — built and live)
```
1. CBREOfficesPageHero       ← pageTitle + searchPlaceholder + panoramic heroImage
2. CBREOfficeListingCard ×N  ← one per office
3. CBREConnectWithExpert     ← CTA breaker (grey bg) at bottom
```
headerMode: `transparent-dark` (hero image is light-toned)

**UAE Offices page item ID:** `8fd46b5b-0d39-41b9-add0-570df3c2c970`
**UAE Offices data folder ID:** `fb2fee33-da4e-4851-9558-94330be69004`

**CBREOfficesPageHero field GUIDs:**
| Field | ID |
|---|---|
| `pageTitle` | `c3d4e5f6-a7b8-9012-cdef-123456789012` |
| `heroImage` | `d4e5f6a7-b8c9-0123-defa-234567890123` |
| `searchPlaceholder` | `e5f6a7b8-c9d0-1234-efab-345678901234` |

**CBREConnectWithExpert field GUIDs:**
| Field | ID |
|---|---|
| `title` | `e1f2a3b4-c5d6-7890-efab-901234567890` |
| `description` | `f2a3b4c5-d6e7-8901-fabc-012345678901` |
| `ctaLabel` | `a3b4c5d6-e7f8-9012-abcd-123456789012` |
| `ctaLink` | `b4c5d6e7-f8a9-0123-bcde-234567890123` |

### Home Page Layout (8 components)
```
1. CBREHeroSection (or CBREHeroSlideSection)
2. CBREFeaturedArticles
3. CBREBannerStrip
4. CBREAboutSection
5. CBREWhatWeDoSection
6. CBRENewsletterSection
7. CBRELatestInsightsSection
8. CBREOurCommitmentSection
```
headerMode: `transparent-light`

### Inner Page Layout (Services, About, etc.)
```
1. CBREServicesHeroSection
2. [Content-specific components]
3. CBREAboutSection (variant)
```
headerMode: `light`

### Minimal Page Layout (Landing/Test)
```
1. CBREHeroSlideSection (or CBREHeroSection)
```
headerMode: `transparent-light`

---

## Push & Verify Workflow

```bash
# 1. Generate all YAML files for the new page
# 2. Push to Sitecore
cd authoring
dotnet sitecore ser push -n dev

# 3. For Multilist items — two-step push
# First push with empty Multilist values, then restore and push again

# 4. Pull to verify
dotnet sitecore ser pull -n dev

# 5. Open in Experience Editor
# https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io/sitecore
# Navigate to the page and verify all components render
```

---

## Reference: Existing Pages

**CBRE Global pages:**

| Page | Path | Template | Components | headerMode |
|---|---|---|---|---|
| Home | `/Home` | `ad73ef66` | 8 (full layout) | transparent-light |
| Test UAEHome | `/Home/Test UAEHome` | `e67af66a` | 1 (HeroSlideSection) | — |
| Services | `/Home/Services` | — | ServicesHero + About + ServiceCards | light |
| Test EmptyPage | `/Home/Test EmptyPage` | — | Empty | — |

**CBRE UAE pages (`cbre-uae`, item ID → preview URL):**

| Page | Item ID | Components | headerMode |
|---|---|---|---|
| UAE Home | `18baed83-c60b-4a7d-b8e6-6d4a98703bb0` | HeroSlideSection + full layout | transparent-light |
| UAE Offices | `8fd46b5b-0d39-41b9-add0-570df3c2c970` | OfficesPageHero + OfficeListingCard×3 + ConnectWithExpert | transparent-dark |

**Local preview URL pattern (UAE):**
```
http://localhost:3000/api/editing/render?sc_itemid={ITEM-ID}&sc_lang=en&sc_site=cbre-uae&sc_layoutKind=final&mode=preview&secret=4zRDzDuuhNZ2gjgszipjNE&route={/route}&tenant_id=2151da52-54cd-408b-dae2-08de6b03c297&sc_version=1
```

---

## Reference: Field GUIDs by Component Template

To populate datasource YAMLs, you need the field GUIDs from each template. Read the existing datasource YAML files to find the exact field IDs:

```bash
# Example: read CBREHeroSection datasource to get field GUIDs
cat authoring/items/items/templates/items/ccl.content.cbre.home/Home/Data/CBREHeroSection.yml
```

When creating new datasources, reuse the same field GUIDs from existing items of the same template.

---

## Quick Reference: System GUIDs

| Purpose | GUID |
|---|---|
| Device ID (Default) | `FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3` |
| Common Folder template | `a87a00b1-e6db-45ab-8b54-636fec3b5523` |
| Home page ID | `7e6b98fe-723e-40c7-b3e3-5c8e02f52beb` |
| headerMode field ID | `160bc458-9b25-4246-b179-0726c0f78c3d` |
| __Renderings field ID | `f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e` |
| __Final Renderings field ID | `04bf00db-f5fb-41f7-8ab7-22408372deb1` |
| __Created field ID | `25bed78c-4957-4165-998a-ca1b52f67497` |
| Page Design field ID | `24171bf1-c0e1-480e-be76-4c0a1876f916` |
| Page Data folder template | `1c82e550-ebcd-4e5d-8abd-d50d0809541e` |
| Partial Design template | `fd2059fd-6043-4dfe-8c04-e2437ce87634` |
| Partial Design Folder template | `fcd9dd5e-ff94-47ab-8387-30d8084ef6bb` |
| Page Design template | `1105b8f8-1e00-426b-bf1f-c840742d827b` |
| PartialDesigns field ID (on Page Design item) | `0966b999-0d0e-4278-acc9-9da69d461fe6` |
| Placeholder Key field ID (on Placeholder Setting item) | `7951e6e6-e4a0-4e7b-8d44-a4c7e7e76c26` |
| Signature field ID (on Partial Design item) | `55faae90-3bba-4f7f-96fe-13c3f40055ff` |
| Placeholder Setting template | `d2a6884c-04d5-4089-a64e-d27ca9d68d4c` |
| Available Renderings template | `76da0a8d-fc7e-42b2-af1e-205b49e43f98` |
| CCL Page template (has headerMode) | `ac9de9be-8e86-4147-8fbc-739d5560408b` |

---

## New Site Setup — Complete Checklist

When a new CBRE regional website is created in XM Cloud, follow these steps **in order**:

> **⚠️ PULL FIRST — MANDATORY RULE**
>
> **NEVER create any YAML files before running `dotnet sitecore ser pull -n dev`.**
>
> All CBRE-specific sub-items (CBRE.yml, Global.yml, Default.yml, Placeholder items, Site Grouping, Home.yml) need parent GUIDs from SXA-scaffolded items that only exist after the pull. If you create files with placeholder values like `REPLACE_WITH_...` before pulling, the pull will fail with YAML parse errors. The only file you create before pulling is the `module.json` entry. Everything else waits until after the pull.
>
> **Correct order: module.json → PULL → read GUIDs → create files → PUSH**

### Step 1 — Add serialization paths to module.json (7 paths)
```json
ccl.content.[region].home           → [Site]/Home
ccl.content.[region].renderings     → [Site]/Presentation/Available Renderings
ccl.content.[region].partialdesigns → [Site]/Presentation/Partial Designs
ccl.content.[region].pagedesigns    → [Site]/Presentation/Page Designs
ccl.content.[region].placeholders   → [Site]/Presentation/Placeholder Settings
ccl.content.[region].settings       → [Site]/Settings
ccl.templates.[region]              → /sitecore/templates/Project/[region-collection]
```

### Step 2 — Pull the site to get existing SXA scaffolding
```bash
cd authoring
dotnet sitecore ser pull -n dev
```

This creates the SXA-scaffolded YAML files. **You MUST read these pulled files to get parent GUIDs before creating CBRE-specific sub-items.** See the Parent GUID Resolution section below.

**If the pull fails with "ORPHAN ITEM" or "EMPTY FOLDER" validation errors**, run validate --fix first:
```bash
dotnet sitecore ser validate --fix
dotnet sitecore ser pull -n dev
```
This cleans up stale local files that conflict with the pull. Then re-run the pull.

**What SXA scaffolding auto-creates (already exists after pull — do NOT create new ones):**
- `Home/` page item (pulled with its real Sitecore ID, Parent, and Template)
- `Home/Data/` folder (already exists — use its pulled ID as parent for CBREHeader/CBREFooter datasources)
- `Presentation/Available Renderings/` folder + sub-groups (FEaaS, Forms, Media, Navigation, etc.)
- `Presentation/Partial Designs/` folder + Header + Footer sub-items
- `Presentation/Page Designs/` folder + `Default` page design item
- `Presentation/Placeholder Settings/` + `Partial Design/` folder + Header + Footer items
- `Settings/Site Grouping/cbre-[region]` item (already exists — update RenderingHost only)

### Step 3 — Resolve Parent GUIDs from pulled files

After the pull, read these files and note their `ID` values:

| Pulled file (after pull) | `ID` becomes parent for... |
|---|---|
| `ccl.content.[region].renderings/Available Renderings.yml` | `Available Renderings/CBRE.yml` → Parent |
| `ccl.content.[region].partialdesigns/Partial Designs.yml` | `Partial Designs/Global.yml` → Parent |
| `ccl.content.[region].pagedesigns/Page Designs.yml` | `Page Designs/Default.yml` → Parent |
| `ccl.content.[region].placeholders/Placeholder Settings/Partial Design.yml` | `Partial Design/CBREHeader.yml` + `CBREFooter.yml` → Parent |
| `ccl.content.[region].settings/Settings/Site Grouping.yml` | `Site Grouping/cbre-[region].yml` → Parent |
| `ccl.content.[region].home/Home.yml` | Use its `ID` in site grouping `StartItem` field; use its `ID` as parent for `Data.yml` |

**CRITICAL:** The Home.yml will be pulled with the existing Sitecore-assigned ID, Parent, and Template. Do NOT create a new Home.yml — **update the pulled one** by adding `headerMode`, `Page Design`, and `__Renderings` SharedFields.

### Step 4 — Add `click-click-launch` Available Renderings
Check if `click-click-launch` rendering group exists in the pulled files. If not, it needs to be created in Content Editor (SXA auto-creates it during site setup).

### Step 5 — Create CBRE Available Renderings group
Create `CBRE.yml` under `Available Renderings/` using the pulled `Available Renderings.yml` ID as parent:

```yaml
---
ID: "[new-guid]"
Parent: "[Available Renderings.yml ID from pull]"
Template: "76da0a8d-fc7e-42b2-af1e-205b49e43f98"
Path: "/sitecore/content/[collection]/[site]/Presentation/Available Renderings/CBRE"
SharedFields:
- ID: "715ae6c0-71c8-4744-ab4f-65362d20ad65"
  Hint: Renderings
  Value: |
    {0BB614EF-377B-47E2-9DDE-3BB50A869DC4}
    {064593F1-512C-4354-926F-F12B979AFDC9}
    {135D80C2-C973-4986-80EB-5F592A9A9414}
    {6AAF45C4-C304-403B-8414-2650A6B3755C}
    {91B1A502-46B8-4DD8-AC14-6E4ED1AF7C25}
    {F2D882FE-9F9F-434C-B408-EAAC1CBB20FD}
    {9AA53759-2BAB-4847-92CE-CAD055ABF5ED}
    {73D1939C-7889-4EEA-A200-5575EDC3FA15}
    {67AFB692-D1E8-4B70-AE5F-29F2A60F7162}
    {36B04144-C06B-4413-9890-466AEEA53970}
    {AA6AE116-FEE7-4F0A-904C-7E0CA5DD0DC4}
    {71A91774-5F4D-4568-AAE1-2CEEE0AEECAD}
    {5BAA51A2-D2B8-4315-B4F6-E74C7EC006D5}
    {7FEEDE78-F3CA-4141-A6A7-484674D95370}
    {B1A8E41E-D725-4B4A-A23B-931A8B6F6994}
    {D1E2F3A4-B5C6-4D7E-8F9A-0B1C2D3E4F5A}
- ID: "dbbbeca1-21c7-4906-9dd2-493c1efa59a2"
  Hint: __Shared revision
  Value: "[same as ID]"
```

### Step 6 — Inherit CCL Page template for headerMode
Add `{AC9DE9BE-8E86-4147-8FBC-739D5560408B}` to the site's Page template `__Base template` field.

**CRITICAL — applies to ALL new regions.** This is the CCL Page template that defines the `headerMode` field. Without it, the `headerMode` dropdown will be missing from page items in the Content Editor, even though the field value can still be written in YAML.

**How to apply:** Edit the region's `Page.yml` under `ccl.templates.[region]/[collection]/Page.yml` and add the GUID to `__Base template`:

```yaml
- ID: "12c33f3f-86c5-43a5-aeb4-5598cec45116"
  Hint: __Base template
  Value: |
    {47151711-26CA-434E-8132-D3E0B7D26683}
    {371D5FBB-5498-4D94-AB2B-E3B70EEBE78C}
    {F39A594A-7BC9-4DB0-BAA1-88543409C1F9}
    {6650FB34-7EA1-4245-A919-5CC0F002A6D7}
    {4414A1F9-826A-4647-8DF4-ED6A95E64C43}
    {AC9DE9BE-8E86-4147-8FBC-739D5560408B}   ← ADD THIS
```

Also update `__Shared revision` to a fresh UUID when making this change.

**Known Page template IDs per region:**

| Region | Page Template ID | File |
|---|---|---|
| MEA (UAE) | `5151282f-6b89-49c4-ade5-a452b9b43d89` | `ccl.templates.mea/middle-east-and-africa/Page.yml` |
| APAC (Thailand) | *(check ccl.templates.apac)* | `ccl.templates.apac/asia-pacific/Page.yml` |
| Europe (UK) | `498f70df-9b05-4195-95ed-0a4a3abeec6f` | `ccl.templates.europe/europe/Page.yml` |

### Step 7 — Create Partial Designs
Generate a new GUID for the `Global` folder. Use the pulled `Partial Designs.yml` ID as parent.

```
Partial Designs/
└── Global/                          ← new GUID (Global folder GUID)
    ├── CBREHeader.yml               ← parent = Global folder GUID
    └── CBREFooter.yml               ← parent = Global folder GUID
```

**CBREHeader partial `__Renderings` XML** (datasource = absolute GUID of `Home/Data/CBREHeader`):
```xml
<r xmlns:p="p" xmlns:s="s" p:p="1">
  <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
    <r uid="{NEW-GUID}"
       s:ds="{CBREHEADER-DATASOURCE-GUID}"
       s:id="{71A91774-5F4D-4568-AAE1-2CEEE0AEECAD}"
       s:par="CSSStyles"
       s:ph="headless-header" />
  </d>
</r>
```

**CBREFooter partial `__Renderings` XML** (datasource = absolute GUID of `Home/Data/CBREFooter`):
```xml
<r xmlns:p="p" xmlns:s="s" p:p="1">
  <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
    <r uid="{NEW-GUID}"
       s:ds="{CBREFOOTER-DATASOURCE-GUID}"
       s:id="{AA6AE116-FEE7-4F0A-904C-7E0CA5DD0DC4}"
       s:par="CSSStyles"
       s:ph="headless-footer" />
  </d>
</r>
```

### Step 8 — Create Placeholder Settings
Add CBREHeader and CBREFooter placeholder settings using the pulled `Placeholder Settings/Partial Design.yml` ID as parent:

```yaml
# CBREHeader
ID: "[new-guid]"
Parent: "[Partial Design.yml ID from pull]"
Template: "d2a6884c-04d5-4089-a64e-d27ca9d68d4c"
SharedFields:
- ID: "7951e6e6-e4a0-4e7b-8d44-a4c7e7e76c26"
  Hint: Placeholder Key
  Value: "sxa-cbreheader"
```

```yaml
# CBREFooter
ID: "[new-guid]"
Parent: "[Partial Design.yml ID from pull]"
Template: "d2a6884c-04d5-4089-a64e-d27ca9d68d4c"
SharedFields:
- ID: "7256bdab-1fd2-49dd-b205-cb4873d2917c"
  Hint: Placeholder Key
  Value: "sxa-cbrefooter"
```

### Step 9 — Update Default Page Design (already exists from SXA)
The `Default` page design is **already created by SXA scaffolding** — do NOT create a new one. Read the pulled `Page Designs/Default.yml` and **update** its `PartialDesigns` field to point to the CBRE partials (replacing the SXA Header/Footer GUIDs):

> PartialDesigns field GUID: `0966b999-0d0e-4278-acc9-9da69d461fe6`

Use the pulled `Page Designs.yml` ID as parent. Reference the CBREHeader + CBREFooter partial GUIDs:

```yaml
ID: "[new-guid]"
Parent: "[Page Designs.yml ID from pull]"
Template: "1105b8f8-1e00-426b-bf1f-c840742d827b"
SharedFields:
- ID: "0966b999-0d0e-4278-acc9-9da69d461fe6"
  Hint: PartialDesigns
  Value: "{CBREHEADER-PARTIAL-GUID}|{CBREFOOTER-PARTIAL-GUID}"
```

### Step 10 — Create Home/Data datasources
The `Home/Data/` folder **already exists from SXA scaffolding** — do NOT create a new Data.yml. Read the pulled `Home/Data.yml` to get its `ID`, then use that as the parent for CBREHeader and CBREFooter datasources:

```yaml
# Data folder — MUST use Page Data folder template, not Common Folder
ID: "[new-guid]"
Parent: "[Home.yml ID from pull]"
Template: "1c82e550-ebcd-4e5d-8abd-d50d0809541e"
```

**CBREHeader datasource** — key field GUIDs:
| Field | ID |
|---|---|
| `primaryLinks` (Multilist) | `30274279-d11e-4f75-8819-9024e703c642` |
| `flagImage` (Image) | `96a2a3c3-4f83-4278-a69c-c75c83c040ed` |
| `logoLight` (Image) | `9f800c48-63de-45dd-9fde-dbc976b67689` |
| `logoDark` (Image) | `e669733e-f463-423c-9976-b12384dc25ab` |

Logo media IDs (shared across all CBRE sites):
- logoDark: `fddba760-155a-4f64-809d-df648663d38b`
- logoLight: `d10c616d-9c30-4a3e-8830-7c207e7839f4`

**CBREFooter datasource** — key field GUIDs:
| Field | ID |
|---|---|
| `primaryLinks` (Multilist) | `8ee56bfa-1eba-45d9-95cc-d33d1d1032af` |
| `secondaryLinks` (Multilist) | `d7c20798-3d56-42ff-9b4a-e479256b13d9` |
| `copyrightText` | `f431a920-95b3-46b7-8720-605dc66d9012` |

**Push Multilist fields in two steps** — set empty first, push, then restore GUIDs and push again.

### Step 11 — Update Home.yml (not create — it was pulled)
Edit the pulled `Home.yml` to add these SharedFields:
```yaml
SharedFields:
- ID: "160bc458-9b25-4246-b179-0726c0f78c3d"
  Hint: headerMode
  Value: "transparent-light"
- ID: "24171bf1-c0e1-480e-be76-4c0a1876f916"
  Hint: Page Design
  Value: "{DEFAULT-PAGE-DESIGN-GUID}"
- ID: "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e"
  Hint: __Renderings
  Value: |
    <r xmlns:p="p" xmlns:s="s" p:p="1">
      <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
        <r uid="{NEW-GUID}" p:before="*" s:ds="local:/Data/CBREHeroSection" s:id="{0BB614EF-377B-47E2-9DDE-3BB50A869DC4}" s:par="CSSStyles" s:ph="headless-main" />
        <r uid="{NEW-GUID}" p:after="r[@uid='{PREV-UID}']" s:ds="local:/Data/CBREAboutSection" s:id="{F2D882FE-9F9F-434C-B408-EAAC1CBB20FD}" s:par="CSSStyles" s:ph="headless-main" />
        <r uid="{NEW-GUID}" p:after="*[1=2]" s:ds="local:/Data/CBREOurCommitmentSection" s:id="{064593F1-512C-4354-926F-F12B979AFDC9}" s:par="CSSStyles" s:ph="headless-main" />
      </d>
    </r>
```

**Note:** All rendering entries need `s:par="CSSStyles"` — without this, some styles won't apply in the Experience Editor.

### Step 12 — Create content datasources (CBREHeroSection etc.)
For each component in the `__Renderings`, create a datasource YAML under `Home/Data/`. See component template IDs in the Component Library table above.

### Step 13 — Update Site Grouping (already exists from SXA)
The `cbre-[region]` site grouping item **already exists from SXA scaffolding** with `RenderingHost: Default`. Read the pulled `Settings/Site Grouping/cbre-[region].yml` and **update** only the `RenderingHost` field to `kit-nextjs-product-starter`. Keep all other SXA-assigned fields intact.

> RenderingHost field GUID: `f57099a3-526a-49f2-aebd-635453e48875`

Full YAML template for reference if creating from scratch for a brand-new site (not SXA-scaffolded):

```yaml
ID: "[new-guid]"
Parent: "[Site Grouping.yml ID from pull]"
Template: "e46f3af2-39fa-4866-a157-7017c4b2a40c"
BranchID: "45cf9f42-b3ac-4412-aab9-f8441c7e448e"
SharedFields:
- ID: "1ee576af-ba8e-4312-9fbd-2ccf8395baa1"
  Hint: StartItem
  Value: "{HOME-PAGE-GUID}"
- ID: "85a7501a-86d9-4243-9075-0b727c3a6db4"
  Hint: Name
  Value: CBRE [Region]
- ID: "cb4e9e2e-2b66-43dc-ad3f-9caf363d28d3"
  Hint: SiteName
  Value: "cbre-[region]"
- ID: "9eaf6dc9-b811-4cda-9edd-9697faba628a"
  Hint: POS
  Value: "en=cbre-[region]"
- ID: "8e0dd914-9afb-4d45-bf8b-7ff5d6e5337e"
  Hint: HostName
  Value: *
- ID: "da06d09e-02b6-464a-80fc-9d8d7fc875e3"
  Hint: Environment
  Value: *
- ID: "f57099a3-526a-49f2-aebd-635453e48875"
  Hint: RenderingHost
  Value: "kit-nextjs-product-starter"
- ID: "301e719a-6f65-4874-b565-a953a7b5ac83"
  Hint: OtherProperties
  Value: isSiteThumbnailSource=true
```

### Step 14 — Push and verify
```bash
dotnet sitecore ser push -n dev
```

**IMPORTANT:** Data folder items must use template `1c82e550` (Page Data folder), NOT `a87a00b1` (common folder).

---

## Figma → Content Entry Workflow

When a Figma design is provided for a new page:

### Step 1 — Fetch and analyse the Figma design
```bash
# Get page structure
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID&depth=5"

# Get screenshot
curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/images/$FILE_KEY?ids=$NODE_ID&format=png&scale=0.5"

# Extract all text content
# Parse the JSON for type=TEXT nodes and extract characters
```

### Step 2 — Map Figma sections to existing CBRE components

| Figma Pattern | CBRE Component | Rendering ID |
|---|---|---|
| Hero with image left + text right | CBREHeroSection | `0BB614EF` |
| Hero with full-bleed image + overlay slides | CBREHeroSlideSection | `5BAA51A2` |
| Inner page hero (title + description + image) | CBREServicesHeroSection | `7FEEDE78` |
| Offices page hero: large title left + search bar right + panoramic image below | CBREOfficesPageHero | `D1E2F3A4` |
| 3 horizontal article cards | CBREFeaturedArticles | `73D1939C` |
| Dark floating banner with CTA | CBREBannerStrip | `9AA53759` |
| Body text + highlighted text + CTA | CBREAboutSection | `F2D882FE` |
| Section title + 3 category tiles | CBREWhatWeDoSection | `91B1A502` |
| Newsletter signup with image | CBRENewsletterSection | `6AAF45C4` |
| Section title + 3 insight cards | CBRELatestInsightsSection | `135D80C2` |
| Section title + 4–6 commitment/credential cards | CBREOurCommitmentSection | `064593F1` |
| Light grey CTA breaker (title + description + solid button) | CBREConnectWithExpert | `B1A8E41E` |

### Step 3 — Identify missing components
If the Figma design has sections that don't match any existing component, **list them out** for the user:
```
Missing components:
- [Section name] — Description of what it shows
- [Section name] — Description of what it shows

These would need new React components + Sitecore templates to be built.
```

### Step 4 — Create datasource YAMLs
For each matched component:
1. Read the global reference datasource to get field GUIDs
2. Create a new YAML with the Figma text content
3. Use the same field GUIDs but with new content values

### Step 5 — Create page YAML with __Renderings
Place all components in order in the `headless-main` placeholder.

### Step 6 — Upload Images from Figma (if needed)

Use the confirmed upload pipeline — see [AUTHORING-GRAPHQL.md](AUTHORING-GRAPHQL.md) for the full reusable Python script.

**Quick steps:**
1. Get images from Figma MCP: `get_design_context` exposes them at `http://localhost:3845/assets/<hash>.png`
2. Run `uploadMedia` GraphQL mutation → get pre-signed URL
3. POST multipart form data to pre-signed URL with `Authorization: Bearer <token>`
4. Get media GUID from response `{"Id": "<guid>", ...}`
5. Add `image` field to datasource YAML: `<image mediaid="<guid>" />`
6. Push via `dotnet sitecore ser push -n dev`

Bearer token from `.sitecore/user.json` → `endpoints.xmCloud.accessToken`. Valid 24h — run `dotnet sitecore cloud login` to refresh.

### Step 7 — Push and verify
```bash
dotnet sitecore ser push -n dev
```

---

## Chrome MCP → Design Workflow

Chrome MCP replaces (or supplements) Figma when the reference is a live website. Use it to extract exact CSS measurements, SVG icons, colors, and layout proportions directly from the browser.

### Available Chrome MCP Tools

| Tool | Use For |
|---|---|
| `mcp__chrome__chrome_navigate` | Open any URL |
| `mcp__chrome__chrome_screenshot` | Capture full-page screenshot for visual comparison |
| `mcp__chrome__chrome_execute_script` | Run JS to measure elements, extract styles, get SVG paths |
| `mcp__chrome__chrome_click` | Click links/buttons to navigate |
| `mcp__chrome__chrome_get_visible_text` | Extract all visible text from a page |

### Step 1 — Navigate and screenshot the live site

```js
// Navigate
mcp__chrome__chrome_navigate({ url: "https://www.cbre.ae/offices" })

// Screenshot for visual reference
mcp__chrome__chrome_screenshot()
```

### Step 2 — Measure exact column/layout widths

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var col = document.querySelector('.your-container-class');
  if (!col) return 'not found';
  var children = col.children;
  var result = [];
  for (var i = 0; i < children.length; i++) {
    var r = children[i].getBoundingClientRect();
    result.push({ class: children[i].className.substring(0,60), width: r.width, left: r.left });
  }
  return JSON.stringify(result);
})()`
})
```

**What to measure for a card/list component:**
- Find the outer container → get its `width` and `left` (centering)
- Find each column child → get `width` for exact pixel values
- `gap = container_width - sum(column_widths)` → divide by column_count-1 for gap size

### Step 3 — Extract exact CSS styles

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var el = document.querySelector('.target-element');
  var s = window.getComputedStyle(el);
  return JSON.stringify({
    color: s.color,
    fontSize: s.fontSize,
    fontFamily: s.fontFamily,
    lineHeight: s.lineHeight,
    padding: s.padding,
    gap: s.gap,
    transition: s.transition,
    backgroundColor: s.backgroundColor
  });
})()`
})
```

### Step 4 — Extract SVG icons from live site DOM

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  // Find all SVGs in a section
  var svgs = document.querySelectorAll('.target-section svg');
  var result = [];
  svgs.forEach(function(svg, i) {
    result.push({
      index: i,
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
      innerHTML: svg.innerHTML.trim()
    });
  });
  return JSON.stringify(result);
})()`
})
```

Use the extracted `viewBox`, `width`, `height`, and `innerHTML` to create exact SVG components in React:
```tsx
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="[extracted path data]" />
  </svg>
);
```

### Step 5 — Verify hover states (inject CSS)

Since `:hover` pseudo-class can't be triggered with JS `dispatchEvent`, inject a style to force hover appearance:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var style = document.createElement('style');
  style.textContent = '.your-link { text-decoration: underline !important; color: #003f2d !important; }';
  document.head.appendChild(style);
  return 'hover state forced — take screenshot to verify';
})()`
})
// Then screenshot to see the hover effect visually
mcp__chrome__chrome_screenshot()
```

### Step 6 — Preview rendered output locally

Use the Sitecore editing/render endpoint to preview pages without logging in:

```
http://localhost:3000/api/editing/render?sc_itemid={PAGE-GUID}&sc_lang=en&sc_site={SITE-NAME}&sc_layoutKind=final&mode=preview&secret={EDITING-SECRET}&route={/page-path}&tenant_id={TENANT-ID}&sc_version=1
```

**Known UAE page preview URLs:**
| Page | sc_itemid |
|---|---|
| UAE Home | `18baed83-c60b-4a7d-b8e6-6d4a98703bb0` |
| UAE Offices | `8fd46b5b-0d39-41b9-add0-570df3c2c970` |

Parameters:
- `sc_site`: `cbre-uae`, `cbre-thailand`, `cbre-global`
- `secret`: from `examples/kit-nextjs-product-listing/.env.local` → `SITECORE_EDITING_SECRET`
- `tenant_id`: from existing preview URLs in session history

### Step 7 — Measure our rendered output to confirm pixel accuracy

After rendering, measure the actual columns to confirm they match the live site:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var cards = document.querySelectorAll('[data-component="CBREOfficeListingCard"]');
  var result = [];
  for (var i = 0; i < cards.length; i++) {
    var inner = cards[i].querySelector('.max-w-\\\\[1110px\\\\]') || cards[i].firstElementChild;
    var children = inner ? inner.children : [];
    var r = inner ? inner.getBoundingClientRect() : {};
    result.push({
      containerWidth: r.width,
      col1: children[0] ? children[0].getBoundingClientRect().width : 0,
      col2: children[1] ? children[1].getBoundingClientRect().width : 0,
      col3: children[2] ? children[2].getBoundingClientRect().width : 0
    });
  }
  return JSON.stringify(result);
})()`
})
```

---

## Chrome MCP — Image Download (CDN Bypass)

**Problem:** `mediaassets.cbre.com` (and similar CDNs) return HTTP 403 when Python `urllib`, `curl`, or Node.js tries to download images — even with browser-like headers. The CDN enforces browser fingerprinting.

**Solution:** Chrome browser CAN access these images. Use Chrome MCP to trigger browser downloads, then upload from `Downloads` folder via Python.

### Step 1 — Trigger Chrome to download images

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var urls = [
    { url: 'https://mediaassets.cbre.com/...image1.jpg', name: 'office-image-1' },
    { url: 'https://mediaassets.cbre.com/...image2.jpg', name: 'office-image-2' },
  ];
  urls.forEach(function(item, i) {
    setTimeout(function() {
      var a = document.createElement('a');
      a.href = item.url;
      a.download = item.name + '.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * 1500);  // stagger 1.5s each to avoid Chrome blocking multiple downloads
  });
  return 'Downloads triggered — check C:/Users/{user}/Downloads/';
})()`
})
```

**Important:** Chrome may block simultaneous downloads. Stagger with `setTimeout`. Wait for all files to appear in `Downloads` before proceeding.

### Step 2 — Upload from Downloads via Python

```python
# upload_from_downloads.py
import json, urllib.request, ssl, uuid

ctx = ssl.create_default_context()
TOKEN = json.load(open('.sitecore/user.json'))['endpoints']['xmCloud']['accessToken']
CM_HOST = "https://xmc-abudhabinat4796-cbrebf7d-dev2972.sitecorecloud.io"
GQL_URL = f"{CM_HOST}/sitecore/api/authoring/graphql/v1"
DOWNLOADS = r"C:\Users\Andiappan Ravi\Downloads"

def get_presigned(item_name, media_folder):
    payload = json.dumps({
        "query": "mutation U($i: UploadMediaInput!) { uploadMedia(input: $i) { presignedUploadUrl } }",
        "variables": {"i": {"itemPath": f"{media_folder}/{item_name}", "overwriteExisting": True}}
    }).encode()
    req = urllib.request.Request(GQL_URL, data=payload, headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"
    })
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())["data"]["uploadMedia"]["presignedUploadUrl"]

def upload(item_name, local_path, media_folder="Project/middle-east-and-africa/cbre-uae/offices"):
    presigned = get_presigned(item_name, media_folder)
    with open(local_path, 'rb') as f:
        img_data = f.read()
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{item_name}.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n"
    ).encode() + img_data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(presigned, data=body, method="POST", headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {TOKEN}"
    })
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())["Id"]

# Run uploads
jobs = [
    {"name": "office-image-1", "file": f"{DOWNLOADS}\\office-image-1.jpg", "datasource": "Office 1"},
    {"name": "office-image-2", "file": f"{DOWNLOADS}\\office-image-2.jpg", "datasource": "Office 2"},
]
for job in jobs:
    media_id = upload(job["name"], job["file"])
    print(f"{job['datasource']}: {media_id}")
```

### Step 3 — Update datasource YAMLs with media IDs

```yaml
- ID: "8890dbe4-e2d6-4236-be15-cdc350fa8c5b"
  Hint: officeImage
  Value: "<image mediaid=\"{MEDIA-ID-FROM-UPLOAD}\" />"
```

Then push: `dotnet sitecore ser push -n dev`

### Known CDN Blocking Issues

| Method | Result |
|---|---|
| Python `urllib` (even with browser headers) | 403 Forbidden |
| `curl` with `--user-agent` | 403 Forbidden |
| Node.js `fetch` | 403 Forbidden |
| Chrome browser (MCP) | ✅ Downloads successfully |
| Figma MCP localhost:3845 | ✅ Works for Figma assets only |

**CORS note:** Cannot POST from Chrome (while on a different domain) to Sitecore API — CORS blocks it. Always upload via Python from the local filesystem, not directly from Chrome.

---

## Component Gaps — New Components Needed

Components identified as missing from the current library based on Figma/live site designs:

| Gap | Description | Source | Status |
|---|---|---|---|
| **Stats Section** | 4 stat boxes with large number + label (e.g. "500+ Offices", "100+ Countries", "155K People", "~90 Fortune 100 Clients") | Thailand About Us page | ⏳ Pending |
| **Contact Us Section** | Contact form or CTA section with address/email/phone details | Thailand About Us page | ⏳ Pending |
| **Image Upload Pipeline** | Automated live site / Figma → Sitecore media library via Authoring GraphQL `uploadMedia` mutation + presigned URL. Bearer token auth. See [AUTHORING-GRAPHQL.md](AUTHORING-GRAPHQL.md). | All pages | ✅ Working |

### Components Added (previously gaps)
| Component | Description | Rendering ID | Template ID |
|---|---|---|---|
| **CBREOfficesPageHero** | Offices listing page hero: large title + search bar (underline style) + panoramic hero image | `D1E2F3A4-B5C6-4D7E-8F9A-0B1C2D3E4F5A` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| **CBREConnectWithExpert** | Light grey `#cad1d3` CTA breaker: title (Financier) + description + solid green button | `B1A8E41E-D725-4B4A-A23B-931A8B6F6994` | `c9d0e1f2-a3b4-5678-cdef-789012345678` |
| **CBREOurCommitmentSection ×6** | Extended from 4 to **6 cards** — grid auto-switches to 3-col when cards > 4 | `064593F1-512C-4354-926F-F12B979AFDC9` | `8cdd20a6-b618-48b1-99c0-6d92185cbece` |

### Workarounds in Use
- **Stats Section**: Content merged into CBREAboutSection bodyText/highlightText (stats not visually separate)
