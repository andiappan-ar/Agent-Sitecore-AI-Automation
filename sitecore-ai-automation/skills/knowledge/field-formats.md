# Field Formats — Knowledge Skill

## Purpose
How to correctly format Sitecore field values when creating or updating items via CLI (YML) or GraphQL mutations.

---

## Simple Field Types

| Field Type | Format | Example |
|---|---|---|
| Single-Line Text | Plain string | `Welcome to our site` |
| Multi-Line Text | Plain string with newlines | `Line 1\nLine 2` |
| Rich Text | HTML string | `<p>Hello <strong>world</strong></p>` |
| Integer | Numeric string | `42` |
| Number | Decimal string | `3.14` |
| Checkbox | `1` or empty | `1` (checked), `` (unchecked) |
| Date | ISO format | `20260328T000000Z` |
| DateTime | ISO format | `20260328T143000Z` |

---

## Reference Field Types

### Droplink / Droptree (single reference)
```
{ITEM-GUID}
```
Example: `{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}`

### TreeList / Multilist (multiple references)
Pipe-separated GUIDs:
```
{GUID-1}|{GUID-2}|{GUID-3}
```
Example: `{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}|{B2C3D4E5-F6A7-8901-BCDE-F12345678901}`

### Grouped Droplink
```
{ITEM-GUID}
```

---

## Media / Image Fields

### Image Field
XML format:
```xml
<image mediaid="{MEDIA-ITEM-GUID}" alt="Alt text" width="800" height="600" />
```

Minimal:
```xml
<image mediaid="{MEDIA-ITEM-GUID}" />
```

### File Field
```xml
<file mediaid="{MEDIA-ITEM-GUID}" />
```

---

## Link Fields

### General Link
```xml
<link linktype="internal" id="{TARGET-ITEM-GUID}" text="Click here" anchor="" querystring="" target="" class="" title="" />
```

### External Link
```xml
<link linktype="external" url="https://example.com" text="Visit" target="_blank" />
```

### Media Link
```xml
<link linktype="media" id="{MEDIA-ITEM-GUID}" text="Download" target="" />
```

### Anchor Link
```xml
<link linktype="anchor" anchor="section-name" text="Jump to section" />
```

---

## Layout Fields

### __Renderings (Layout Delta)
Complex XML defining the page layout. Usually managed via Experience Editor or serialization — rarely edited directly.

### __Final Renderings
Same format as `__Renderings` but for the final layout (overrides shared).

---

## System Fields (Shared)

| Field | Hint | Purpose |
|---|---|---|
| `{BA3F86A2-4A1C-4D78-B63D-91C2779C1B5E}` | `__Sortorder` | Item sort order (e.g. `100`, `200`) |
| `{25BED78C-4957-4165-998A-CA1B52F67497}` | `__Created` | Creation timestamp |
| `{D9CF14B1-FA16-4BA6-9288-E8A174D4D522}` | `__Updated` | Last modified timestamp |
| `{8CDC337E-A112-42FB-BBB4-4143751E123F}` | `__Revision` | Revision GUID |
| `{F1A1FE9E-A60C-4DDB-A3A0-BB5B29FE732E}` | `__Renderings` | Shared layout |
| `{04BF00DB-F5FB-41F7-8AB7-22408372A981}` | `__Final Renderings` | Final layout |

---

## YML Serialization Format

```yaml
---
ID: "c81b907a-1d16-45d4-9d80-0219de9ec9ee"
Parent: "11111111-1111-1111-1111-111111111111"
Template: "76036f5e-cbce-46d1-af0a-4143f9b557aa"
Path: /sitecore/content/Tenant/Site/Home/my-page
SharedFields:
- ID: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e"
  Hint: __Sortorder
  Value: "100"
Languages:
- Language: en
  Versions:
  - Version: 1
    Fields:
    - ID: "75577384-3c97-45da-a847-81b00500e250"
      Hint: Title
      Value: "My Page Title"
    - ID: "a4f985d9-98b3-4b52-aaaf-4344f6e747c6"
      Hint: Content
      Value: "<p>Page content</p>"
```

---

## GUID Generation

When creating new items via YML, generate valid GUIDs:
```powershell
[guid]::NewGuid().ToString()
# Output: c81b907a-1d16-45d4-9d80-0219de9ec9ee
```

Or in bash:
```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

**Always wrap in braces when used in field values:** `{c81b907a-1d16-45d4-9d80-0219de9ec9ee}`

---

## Related Skills
- [Authoring GraphQL](../access/authoring-graphql.md) — Using field values in mutations
- [CLI Commands](../access/cli-commands.md) — YML format for serialization
- [Template Reference](template-reference.md) — Which fields belong to which templates
