# Skill: Generate Datasource Item YAML

Create a Sitecore datasource item — the content data for a component on a page.

## What This File Does
Each component on a page has a datasource item in the page's Data folder. This contains the actual content (headings, text, images, links) that the component renders.

## Exact YAML Pattern

```yaml
---
ID: "{{DATASOURCE_ID}}"
Parent: "{{DATA_FOLDER_ID}}"
Template: "{{COMPONENT_TEMPLATE_ID}}"
Path: "/sitecore/content/{{Collection}}/{{SiteName}}/Home/{{PageName}}/Data/{{ComponentName}}"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "{{FIELD_1_GUID}}"
      Hint: heading
      Value: "Welcome to Our Company"
    - ID: "{{FIELD_2_GUID}}"
      Hint: bodyText
      Value: "We deliver exceptional value..."
    - ID: "{{IMAGE_FIELD_GUID}}"
      Hint: backgroundImage
      Value: |
        <image mediaid="{MEDIA_GUID}" alt="Hero background" />
    - ID: "{{LINK_FIELD_GUID}}"
      Hint: ctaLink
      Value: |
        <link linktype="internal" id="{TARGET_PAGE_GUID}" text="Learn More" />
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
    - ID: "52807595-0f8f-4b20-8d2a-cb71d28c6103"
      Hint: __Owner
      Value: |
        sitecore\Admin
```

## Data Folder YAML (create first)

Before datasource items, create the Data folder:
```yaml
---
ID: "{{DATA_FOLDER_ID}}"
Parent: "{{PAGE_ID}}"
Template: "fe5dd826-48c6-436d-b87a-7c4210c7413b"
Path: "/sitecore/content/{{Collection}}/{{SiteName}}/Home/{{PageName}}/Data"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
```

## Field Value Formats

### Single-Line Text / Rich Text
```yaml
- ID: "{{FIELD_GUID}}"
  Hint: heading
  Value: "The actual text content"
```

### Image
```yaml
- ID: "{{FIELD_GUID}}"
  Hint: backgroundImage
  Value: |
    <image mediaid="{MEDIA_ITEM_GUID}" alt="Description" />
```

### General Link (internal)
```yaml
- ID: "{{FIELD_GUID}}"
  Hint: ctaLink
  Value: |
    <link linktype="internal" id="{TARGET_ITEM_GUID}" anchor="" querystring="" target="" class="" text="Link Text" title="" />
```

### General Link (external)
```yaml
- ID: "{{FIELD_GUID}}"
  Hint: ctaLink
  Value: |
    <link linktype="external" url="https://example.com" target="_blank" text="External Link" />
```

## CBRE Reference Example

**CBREAboutSection datasource:**
```yaml
---
ID: "6fae1a0b-d24d-4f56-9759-11b19709e872"
Parent: "c4a09b54-37f6-49af-9fb9-496fdc02f2c1"
Template: "2c3d55be-4659-4cad-bf70-1d0e338f60e2"
Path: "/sitecore/content/cbre/cbre-global/Home/Data/CBREAboutSection"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "216259c4-3add-49d9-a3b8-f6a9782f1614"
      Hint: highlightText
      Value: With services, insights and data that span every dimension of the industry
    - ID: "9c8909a7-019b-4dcf-82c7-b31de4c7c303"
      Hint: ctaLink
      Value: |
        <link linktype="internal" id="7e6b98fe-723e-40c7-b3e3-5c8e02f52beb" anchor="" querystring="" target="" class="" text="" title=""/>
    - ID: "e2720b5f-a86a-49f3-8f57-596f09c6189d"
      Hint: ctaLabel
      Value: Learn More
    - ID: "f77d071a-a638-443f-b149-84e2168dc25a"
      Hint: bodyText
      Value: "As the global leader, we specialize in delivering top-tier commercial real estate services."
```

## Rules

1. **Template** must be the component's template root ID — same as the one defined in the serialization 5-file set
2. **Parent** is the Data folder ID under the page
3. **Field IDs** must match the field GUIDs from the template's field items
4. **Field Hints** must match the field names exactly (camelCase)
5. **Path** follows: `{PagePath}/Data/{ComponentName}`
6. Image values use XML format: `<image mediaid="{guid}" />`
7. Link values use XML format: `<link linktype="..." ... />`

## Validation Checklist
- [ ] Template = component template root ID
- [ ] Parent = Data folder ID
- [ ] Field IDs match template field item GUIDs
- [ ] Field Hints match template field names
- [ ] Image fields use `<image mediaid="..." />` format
- [ ] Link fields use `<link linktype="..." />` format
