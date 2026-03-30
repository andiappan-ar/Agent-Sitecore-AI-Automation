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
- ID: "1845a951-d5b6-4a68-9ffb-41620125aaee"
  Hint: Component Name
  Value: "{{ComponentName}}"
- ID: "b5b27af1-25ef-4e75-94e2-8274d8c1e4cd"
  Hint: Datasource Location
  Value: "query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/{{ComponentName}}"
- ID: "1a7c85e5-dc0b-4b1d-9b6e-5e5e5e5e5e5e"
  Hint: Datasource Template
  Value: "{{TEMPLATE_ROOT_ID}}"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
```

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
