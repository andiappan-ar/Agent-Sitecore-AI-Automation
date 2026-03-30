# Skill: Cross-File Validation Rules

Rules for validating the complete 5-file component set. Run after all files are generated.

## The 5-File Set

| File | Template GUID | Parent must be |
|---|---|---|
| 1. Template root | `ab86861a-6030-46c5-b394-e8f99e8b87db` | Site component folder |
| 2. Field section | `e269fbb5-3750-427a-9149-7aa950b49301` | Template root ID |
| 3. Field items (N) | `455a3e98-a627-4b40-8035-e683a0331ac7` | Field section ID |
| 4. Standard values | Same as template root ID | Template root ID |
| 5. Rendering | `04646a89-996f-4ee7-878a-ffdbf1f0ef0d` | Rendering folder |

## Cross-File Validation Rules

### 1. Parent Chain Must Be Connected
```
Template Root (ID: AAA)
  └── Field Section (Parent: AAA, ID: BBB)
        ├── Field 1 (Parent: BBB)
        ├── Field 2 (Parent: BBB)
        └── Field 3 (Parent: BBB)
  └── __Standard Values (Parent: AAA, Template: AAA)

Rendering (references Template Root via Datasource Template)
```

### 2. All GUIDs Must Be Unique
No two files may share the same `ID:` value. Check across all 5+ files.

### 3. Standard Values Template = Template Root ID
```
If Template Root ID = "4dddcbac-a737-4c55-8ec8-508f1550d44a"
Then Standard Values Template = "4dddcbac-a737-4c55-8ec8-508f1550d44a"  ← SAME
```

### 4. Template Root References Standard Values
```
Template Root SharedField __Standard values = "{STANDARD_VALUES_ID}"
Standard Values ID = "STANDARD_VALUES_ID"
```
These must match.

### 5. Rendering References Template Root
```
Rendering SharedField Datasource Template = TEMPLATE_ROOT_ID
Template Root ID = TEMPLATE_ROOT_ID
```

### 6. Paths Must Form a Valid Tree
```
/sitecore/templates/Project/{Collection}/Components/{Site}/{Component}
/sitecore/templates/Project/{Collection}/Components/{Site}/{Component}/Content
/sitecore/templates/Project/{Collection}/Components/{Site}/{Component}/Content/{field1}
/sitecore/templates/Project/{Collection}/Components/{Site}/{Component}/Content/{field2}
/sitecore/templates/Project/{Collection}/Components/{Site}/{Component}/__Standard Values
/sitecore/layout/Renderings/Project/{Collection}/{Site}/{Component}
```

### 7. Field Sort Orders Are Sequential
Fields should increment by 100: 100, 200, 300, 400...
No duplicates within the same section.

### 8. __Base Template Must Have Required GUIDs
Template root __Base template MUST contain:
- `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` (Standard)
- `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` (_PerSiteStandardValues)

### 9. Component Name in Rendering Matches React Export
The `Component Name` SharedField in the rendering must exactly match:
- The React file name (without extension)
- The named export (`Default`) component

### 10. No Markdown or Fences in Output
YAML files must be pure YAML — no ```yaml fences, no explanatory text.

## Quick Validation Script (pseudocode)
```
for each file:
  parse YAML
  check ID is unique
  check Template matches expected GUID for file type
  check Parent chains are connected

check template_root.__Standard_values == standard_values.ID
check standard_values.Template == template_root.ID
check rendering.Datasource_Template == template_root.ID
check all field_items.Parent == field_section.ID
check field_section.Parent == template_root.ID
check standard_values.Parent == template_root.ID
```
