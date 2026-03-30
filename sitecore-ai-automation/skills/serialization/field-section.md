# Skill: Generate Field Section YAML

Generate the field section (grouping container) YAML for a Sitecore component template.
This is File 2 of the 5-file component set.

## What This File Does
Creates a section container that groups fields together under the template.
Typically named "Content" or "Data".

## Exact YAML Pattern

```yaml
---
ID: "{{FIELD_SECTION_ID}}"
Parent: "{{TEMPLATE_ROOT_ID}}"
Template: "e269fbb5-3750-427a-9149-7aa950b49301"
Path: "/sitecore/templates/Project/{{Collection}}/Components/{{SiteName}}/{{ComponentName}}/Content"
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

1. **Template MUST be** `e269fbb5-3750-427a-9149-7aa950b49301` — this is the "Template section" template
2. **Parent MUST be** the template root ID (from File 1)
3. **Section name** is typically "Content" — appended to the path
4. **Path** follows: `{TemplateRootPath}/Content`
5. **Minimal fields** — just __Created timestamp is sufficient
6. No SharedFields needed for basic sections

## CBRE Reference Example

```yaml
---
ID: "a95fe661-d63f-47f8-9814-662fa2eba7b7"
Parent: "4dddcbac-a737-4c55-8ec8-508f1550d44a"
Template: "e269fbb5-3750-427a-9149-7aa950b49301"
Path: "/sitecore/templates/Project/click-click-launch/Components/Accordions/AccordionBlock/Accordion"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: 20250207T155828Z
```

## Validation Checklist
- [ ] Template = `e269fbb5-3750-427a-9149-7aa950b49301`
- [ ] Parent = template root ID
- [ ] Path = template root path + `/Content`
