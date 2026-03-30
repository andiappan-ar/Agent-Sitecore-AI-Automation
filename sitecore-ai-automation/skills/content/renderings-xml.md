# Skill: Generate __Renderings XML

Add component placement to a page via the __Renderings field.

## What This File Does
The `__Renderings` field on a page item defines which components appear and in what order. It's an XML structure that references rendering IDs and datasource IDs.

## XML Format

```xml
<r xmlns:p="p" xmlns:s="s"
  p:p="1"
  s:id="{DEFAULT-DEVICE-ID}">
  <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
    <r uid="{UNIQUE-PLACEMENT-ID}"
       s:id="{RENDERING_ID_1}"
       s:ds="{DATASOURCE_ID_1}"
       s:ph="/headless-main" />
    <r uid="{UNIQUE-PLACEMENT-ID-2}"
       s:id="{RENDERING_ID_2}"
       s:ds="{DATASOURCE_ID_2}"
       s:ph="/headless-main" />
  </d>
</r>
```

## Key Attributes

| Attribute | What it is |
|---|---|
| `s:id` | Rendering ID (from rendering-definition.md) |
| `s:ds` | Datasource item ID (content item) |
| `s:ph` | Placeholder name (usually `/headless-main`) |
| `uid` | Unique placement ID (new GUID for each placement) |
| `d id` | Device ID — always `{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}` for default |

## How It Goes Into YAML

The __Renderings XML goes into the page item's SharedFields:

```yaml
SharedFields:
- ID: "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e"
  Hint: __Renderings
  Value: |
    <r xmlns:p="p" xmlns:s="s" p:p="1">
      <d id="{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}">
        <r uid="{NEW-GUID-1}" s:id="{HERO-RENDERING-ID}" s:ds="{HERO-DATASOURCE-ID}" s:ph="/headless-main" />
        <r uid="{NEW-GUID-2}" s:id="{ABOUT-RENDERING-ID}" s:ds="{ABOUT-DATASOURCE-ID}" s:ph="/headless-main" />
      </d>
    </r>
```

## Component Order

Components render in the order they appear in the XML. First `<r>` = first component on page, etc.

Typical page order:
1. Header (if not in partial design)
2. Hero
3. Content sections
4. Footer (if not in partial design)

## Placeholder Names

| Placeholder | Use for |
|---|---|
| `/headless-main` | Main content area (most components) |
| `/headless-header` | Header area |
| `/headless-footer` | Footer area |

## Rules

1. Each `uid` must be a unique GUID (different from all other uids on the page)
2. `s:id` must reference a valid rendering ID
3. `s:ds` must reference a valid datasource item ID
4. Device ID is always `{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}`
5. Keep the XML on a single line or use `|` block scalar in YAML

## Validation Checklist
- [ ] XML is well-formed
- [ ] Device ID = `{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}`
- [ ] Each rendering `s:id` matches a real rendering ID
- [ ] Each `s:ds` matches a real datasource item ID
- [ ] All `uid` values are unique
- [ ] Placeholder names are valid
