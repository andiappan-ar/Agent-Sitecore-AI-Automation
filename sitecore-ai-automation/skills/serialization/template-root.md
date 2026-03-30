# Skill: Generate Template Root YAML

Generate the root template definition YAML for a Sitecore component.
This is File 1 of the 5-file component set.

## What This File Does
Defines the component template in Sitecore — the "schema" for the component's data.

## Exact YAML Pattern

```yaml
---
ID: "{{TEMPLATE_ID}}"
Parent: "{{PARENT_FOLDER_ID}}"
Template: "ab86861a-6030-46c5-b394-e8f99e8b87db"
Path: "/sitecore/templates/Project/{{Collection}}/Components/{{SiteName}}/{{ComponentName}}"
SharedFields:
- ID: "06d5295c-ed2f-4a54-9bf2-26228d113318"
  Hint: __Icon
  Value: Office/32x32/elements3.png
- ID: "12c33f3f-86c5-43a5-aeb4-5598cec45116"
  Hint: __Base template
  Value: |
    {1930BBEB-7805-471A-A3BE-4858AC7CF696}
    {44A022DB-56D3-419A-B43B-E27E4D8E9C41}
- ID: "f7d48a55-2158-4f02-9356-756654404f73"
  Hint: __Standard values
  Value: "{{STANDARD_VALUES_ID}}"
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

1. **Template MUST be** `ab86861a-6030-46c5-b394-e8f99e8b87db` — this is the "Template" template
2. **__Base template MUST include BOTH:**
   - `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` (Standard)
   - `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` (_PerSiteStandardValues)
3. **__Standard values** must reference the Standard Values item ID (pre-generated)
4. **Path** follows: `/sitecore/templates/Project/{Collection}/Components/{SiteName}/{ComponentName}`
5. **Parent** is the site's component folder ID
6. **Timestamp** format: `YYYYMMDDTHHMMSSZ` (e.g., `20260330T120000Z`)
7. All GUIDs use lowercase with hyphens in the ID/Parent fields
8. __Base template GUIDs use UPPERCASE with braces, one per line with `|` block scalar

## CBRE Reference Example

From the working CBRE project (AccordionBlock template root):
```yaml
---
ID: "4dddcbac-a737-4c55-8ec8-508f1550d44a"
Parent: "5c934602-4d7b-4438-9f49-85f8e1c6c1aa"
Template: "ab86861a-6030-46c5-b394-e8f99e8b87db"
Path: "/sitecore/templates/Project/click-click-launch/Components/Accordions/AccordionBlock"
SharedFields:
- ID: "06d5295c-ed2f-4a54-9bf2-26228d113318"
  Hint: __Icon
  Value: office/32x32/elements3.png
- ID: "12c33f3f-86c5-43a5-aeb4-5598cec45116"
  Hint: __Base template
  Value: |
    {1930BBEB-7805-471A-A3BE-4858AC7CF696}
    {44A022DB-56D3-419A-B43B-E27E4D8E9C41}
    {D0F6BE14-2A2D-4C56-ACB5-80CAA573B8E2}
    {8BA7DAC6-32ED-4378-BD9E-5DA5B0F9848D}
- ID: "f7d48a55-2158-4f02-9356-756654404f73"
  Hint: __Standard values
  Value: "{58603E75-2B2B-4128-BC7E-EDE64C18008D}"
```

## Validation Checklist
- [ ] Template = `ab86861a-6030-46c5-b394-e8f99e8b87db`
- [ ] __Base template contains `1930BBEB` (Standard)
- [ ] __Base template contains `44A022DB` (_PerSiteStandardValues)
- [ ] __Standard values references a valid GUID
- [ ] Path follows convention
- [ ] ID and Parent are valid GUIDs
