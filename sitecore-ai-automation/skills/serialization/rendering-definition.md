# Skill: Generate Rendering Definition YAML

Generate the rendering definition YAML for a Sitecore component.
This is File 5 of the 5-file component set.

## What This File Does
Registers the component as a rendering in Sitecore. Links the React component name to the Sitecore template and defines where content authors create datasources.

## Exact YAML Pattern

```yaml
---
ID: "{{RENDERING_ID}}"
Parent: "{{RENDERING_FOLDER_ID}}"
Template: "04646a89-996f-4ee7-878a-ffdbf1f0ef0d"
Path: "/sitecore/layout/Renderings/Project/{{Collection}}/{{SiteName}}/{{ComponentName}}"
SharedFields:
- ID: "037fe404-dd19-4bf7-8e30-4dadf68b27b0"
  Hint: componentName
  Value: "{{ComponentName}}"
- ID: "1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f"
  Hint: Datasource Template
  Value: "/sitecore/templates/Project/{{Collection}}/Components/{{SiteName}}/{{TemplateName}}"
- ID: "b5b27af1-25ef-405c-87ce-369b3a004016"
  Hint: Datasource Location
  Value: "./Data"
- ID: "7d8ae35f-9ed1-43b5-96a2-0a5f040d4e4e"
  Hint: Open Properties after Add
  Value: 0
- ID: "a3411ff6-c978-40aa-b059-a49b9ca2209b"
  Hint: Can select Page as a data source
  Value: 1
- ID: "e829c217-5e94-4306-9c48-2634b094fdc2"
  Hint: OtherProperties
  Value: IsRenderingsWithDynamicPlaceholders=true
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
```

**CRITICAL SharedFields (learned from CBRE + real testing):**
- `componentName` (037fe404) — MUST match the TSX component map key exactly
- `Datasource Template` (1a7c85e5) — full path to template, NOT a GUID
- `Datasource Location` (b5b27af1) — `./Data` for simple setup, or query for specific folder
- `Open Properties after Add` (7d8ae35f) — set to 0
- `Can select Page as a data source` (a3411ff6) — set to 1
- `OtherProperties` (e829c217) — `IsRenderingsWithDynamicPlaceholders=true`

**Without these fields, linking a datasource via `s:ds=` in `__Renderings` causes layout service 500.**

## Rules

1. **Template MUST be** `04646a89-996f-4ee7-878a-ffdbf1f0ef0d` — this is the "View rendering" template
2. **Component Name** must EXACTLY match the React component's export name
   - React: `export const Default = ...` in file `CBREHeroSection.tsx`
   - Rendering: `Component Name: CBREHeroSection`
3. **Datasource Location** uses the ancestor-or-self query pattern:
   ```
   query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/{ComponentName}
   ```
   - `2DC3AF7B` = Page template ID — navigates up to nearest page
   - `/Data/{ComponentName}` = folder where content authors create datasource items
4. **Datasource Template** = the template root ID from File 1
5. **Path** follows: `/sitecore/layout/Renderings/Project/{Collection}/{SiteName}/{ComponentName}`
6. **Parent** is the site's rendering folder ID

## CBRE Reference Example

**Rendering folder (container):**
```yaml
---
ID: "c2ecebbb-47f8-47b7-af14-ea15ab17a109"
Parent: "9dbe8119-926f-400a-a738-6f3a43f86f75"
Template: "7ee0975b-0698-493e-b3a2-0b2ef33d0522"
Path: "/sitecore/layout/Renderings/Project/click-click-launch/Accordions"
SharedFields:
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 0
```

Note: The CBRE project uses rendering FOLDERS (`7ee0975b`) as containers, then individual renderings (`04646a89`) inside them. For simpler setups, renderings go directly under the site folder.

## Datasource Query Explained

```
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/HeroBanner
```

Step by step:
1. `.` — start from current item (the page)
2. `ancestor-or-self::*` — walk up the tree
3. `[@@templateid='{2DC3AF7B}']` — find the first item with Page template
4. `/Data/HeroBanner` — go into its Data folder, then HeroBanner subfolder

This means: "Find datasources in the Data/HeroBanner folder under the current page."

## Validation Checklist
- [ ] Template = `04646a89-996f-4ee7-878a-ffdbf1f0ef0d`
- [ ] Has `Component Name` SharedField matching React export
- [ ] Has `Datasource Location` with correct query pattern
- [ ] Has `Datasource Template` pointing to template root ID
- [ ] Path under `/sitecore/layout/Renderings/Project/`
