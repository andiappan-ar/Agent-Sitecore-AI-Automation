# Skill: Generate Field Item YAML

Generate an individual field definition YAML for a Sitecore component template.
This is File 3 of the 5-file component set. One file per field.

## What This File Does
Defines a single field on the component template — its name, type, sort order, and display settings.

## Exact YAML Pattern

```yaml
---
ID: "{{FIELD_ID}}"
Parent: "{{FIELD_SECTION_ID}}"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: "/sitecore/templates/Project/{{Collection}}/Components/{{SiteName}}/{{ComponentName}}/Content/{{fieldName}}"
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: "{{FieldType}}"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: {{SortOrder}}
Languages:
- Language: en
  Fields:
  - ID: "19a69332-a23e-4e70-8d16-b2640cb24cc8"
    Hint: Title
    Value: "{{Field Display Name}}"
  - ID: "b5e02ad9-d56f-4c41-a065-a133db87bdeb"
    Hint: __Display name
    Value: "{{Field Display Name}}"
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
```

## Rules

1. **Template MUST be** `455a3e98-a627-4b40-8035-e683a0331ac7` — this is the "Template field" template
2. **Parent MUST be** the field section ID (from File 2)
3. **Type SharedField** is REQUIRED — must be one of the valid field types
4. **Sort order** increments by 100 per field: 100, 200, 300...
5. **Path** follows: `{FieldSectionPath}/{fieldName}` (camelCase field name)
6. **Title and __Display name** should be human-readable (e.g., "Heading", "Body Text")

## Field Type Variants

### Single-Line Text (most common)
```yaml
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: "Single-Line Text"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
```

### Rich Text
```yaml
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: "Rich Text"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 200
```

### Image (with Source query)
```yaml
SharedFields:
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "query:$siteMedia"
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Image
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 300
```

### General Link (with Source query)
```yaml
SharedFields:
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "query:$linkableHomes"
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: General Link
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 400
```

### Checkbox
```yaml
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Checkbox
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 500
```

## CBRE Reference Examples

**Single-Line Text field (heading):**
```yaml
---
ID: "23c31b2b-4652-4755-94b0-184bca384219"
Parent: "a95fe661-d63f-47f8-9814-662fa2eba7b7"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: "/sitecore/templates/Project/click-click-launch/Components/Accordions/AccordionBlock/Accordion/heading"
SharedFields:
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: "Single-Line Text"
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
Languages:
- Language: en
  Fields:
  - ID: "19a69332-a23e-4e70-8d16-b2640cb24cc8"
    Hint: Title
    Value: Heading
  - ID: "b5e02ad9-d56f-4c41-a065-a133db87bdeb"
    Hint: __Display name
    Value: Heading
```

**Image field (with Source):**
```yaml
---
ID: "14920a91-7250-436e-bf61-750d46eb7f3f"
Parent: "ce59aecb-d7ca-4e4c-ac2c-0beba0de35af"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: "/sitecore/templates/Project/click-click-launch/Components/Media/Image/Image/image"
SharedFields:
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "query:$siteMedia"
- ID: "24cb32f0-e364-4f37-b400-0f2899097b5b"
  Hint: Enable Shared Language Fallback
  Value: 1
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: Image
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 100
```

**General Link field:**
```yaml
---
ID: "27fc9ad4-02a9-4660-bce7-26a9ac2ccb00"
Parent: "544cb75b-b370-47fd-a85c-11c31c7f244b"
Template: "455a3e98-a627-4b40-8035-e683a0331ac7"
Path: "/sitecore/templates/Project/click-click-launch/Components/Banners/Hero/Hero/searchLink"
SharedFields:
- ID: "1eb8ae32-e190-44a6-968d-ed904c794ebf"
  Hint: Source
  Value: "query:$linkableHomes"
- ID: "ab162cc0-dc80-4abf-8871-998ee5d7ba32"
  Hint: Type
  Value: General Link
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: 600
```

## Validation Checklist
- [ ] Template = `455a3e98-a627-4b40-8035-e683a0331ac7`
- [ ] Parent = field section ID
- [ ] Has Type SharedField with valid field type
- [ ] Has __Sortorder (increments by 100)
- [ ] Has Title and __Display name in Languages
- [ ] Image fields have Source = `query:$siteMedia`
- [ ] Link fields have Source = `query:$linkableHomes`
