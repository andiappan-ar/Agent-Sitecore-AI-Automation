# Skill: Generate Page YAML

Create a Sitecore page item YAML under the site's Home content tree.

## Exact YAML Pattern

```yaml
---
ID: "{{PAGE_ID}}"
Parent: "{{PARENT_PAGE_ID}}"
Template: "{{PAGE_TEMPLATE_ID}}"
Path: "/sitecore/content/{{Collection}}/{{SiteName}}/Home/{{PageName}}"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "a4f985d9-98b3-4b52-aaaf-4344f6e747c6"
      Hint: Title
      Value: "{{Page Title}}"
    - ID: "ca3f86a2-4a1c-4d78-b63d-91c2779c1b5f"
      Hint: NavigationTitle
      Value: "{{Navigation Title}}"
    - ID: "25bed78c-4957-4165-998a-ca1b52f67497"
      Hint: __Created
      Value: "{{TIMESTAMP}}"
    - ID: "52807595-0f8f-4b20-8d2a-cb71d28c6103"
      Hint: __Owner
      Value: |
        sitecore\Admin
```

## Rules

1. **Parent** is typically the Home item ID or another page's ID
2. **Template** depends on the site — use the page template ID from environments.json
3. **Path** follows: `/sitecore/content/{Collection}/{SiteName}/Home/{PageName}`
4. **Title** and **NavigationTitle** are the minimum required fields
5. **Language** should match site's primary language (usually `en`)
6. Pages need a `/Data` child folder for datasource items (see datasource-creation.md)

## Nested Pages

For subpages, the Parent becomes the parent page ID:
```
/Home (Parent: site root)
  /About (Parent: Home ID)
    /Team (Parent: About ID)
```

## Validation Checklist
- [ ] Has valid ID, Parent, Template
- [ ] Path under `/sitecore/content/{Collection}/{SiteName}/Home/`
- [ ] Has Title and NavigationTitle fields
- [ ] Language matches site config
