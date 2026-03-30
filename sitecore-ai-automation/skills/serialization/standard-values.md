# Skill: Generate Standard Values YAML

Generate the __Standard Values YAML for a Sitecore component template.
This is File 4 of the 5-file component set.

## What This File Does
Creates the default values item for the template. Every instance of this template inherits these defaults.

## Exact YAML Pattern

```yaml
---
ID: "{{STANDARD_VALUES_ID}}"
Parent: "{{TEMPLATE_ROOT_ID}}"
Template: "{{TEMPLATE_ROOT_ID}}"
Path: "/sitecore/templates/Project/{{Collection}}/Components/{{SiteName}}/{{ComponentName}}/__Standard Values"
SharedFields:
- ID: "ca9b9f52-4fb0-4f87-a79f-24dea62cda65"
  Hint: __Default workflow
  Value: "{A053ED9F-4099-4682-9411-2B4C98E481E4}"
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

1. **Template MUST be the SAME as the template root ID** — NOT a standard values template GUID
   - This is the most common mistake — the Standard Values item's Template field = its parent template
2. **Parent MUST be** the template root ID (from File 1)
3. **Path** ends with `/__Standard Values` (double underscore, capital S and V)
4. **__Default workflow** is optional but recommended: `{A053ED9F-4099-4682-9411-2B4C98E481E4}`
5. Can include default field values in the Languages/Versions section (e.g., `$name` token)

## CBRE Reference Example

**AccordionBlock Standard Values:**
```yaml
---
ID: "58603e75-2b2b-4128-bc7e-ede64c18008d"
Parent: "4dddcbac-a737-4c55-8ec8-508f1550d44a"
Template: "4dddcbac-a737-4c55-8ec8-508f1550d44a"
Path: "/sitecore/templates/Project/click-click-launch/Components/Accordions/AccordionBlock/__Standard Values"
SharedFields:
- ID: "1172f251-dad4-4efb-a329-0c63500e4f1e"
  Hint: __Masters
  Value: "{75BC6AB0-2492-4129-9F90-CA0BAB019E07}"
- ID: "ca9b9f52-4fb0-4f87-a79f-24dea62cda65"
  Hint: __Default workflow
  Value: "{A053ED9F-4099-4682-9411-2B4C98E481E4}"
Languages:
- Language: en
  Versions:
  - Version: 2
    Fields:
    - ID: "23c31b2b-4652-4755-94b0-184bca384219"
      Hint: heading
      Value: $name
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20250214T201428Z
```

**Image Standard Values (with default field values):**
```yaml
---
ID: "131c7f82-7161-4d87-b2e4-130fe0029ab4"
Parent: "3720c1c9-5ef8-4ba1-828b-a4672503a1ae"
Template: "3720c1c9-5ef8-4ba1-828b-a4672503a1ae"
Path: "/sitecore/templates/Project/click-click-launch/Components/Media/Image/__Standard Values"
SharedFields:
- ID: "ca9b9f52-4fb0-4f87-a79f-24dea62cda65"
  Hint: __Default workflow
  Value: "{A053ED9F-4099-4682-9411-2B4C98E481E4}"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "14920a91-7250-436e-bf61-750d46eb7f3f"
      Hint: image
      Value: |
        <image mediaid="{0FA8E7E7-E14B-4992-9FC8-AFF70C25F214}" />
    - ID: "d4a48cb4-1f43-433b-8a45-b781349746db"
      Hint: caption
      Value: Image Caption Field
```

## Key Pattern: Template = Parent Template

```
Template Root:      ID = "4dddcbac-..."
Standard Values:    Template = "4dddcbac-..."    ← SAME as parent's ID
                    Parent = "4dddcbac-..."      ← parent IS the template root
```

## Validation Checklist
- [ ] Template = SAME as Parent (both = template root ID)
- [ ] Parent = template root ID
- [ ] Path ends with `/__Standard Values`
- [ ] Has __Default workflow (optional but recommended)
