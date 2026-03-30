# System GUIDs Reference

All fixed GUIDs used across Sitecore XM Cloud. These NEVER change.

## Template System GUIDs

| What | GUID | When to use |
|---|---|---|
| Template item template | `ab86861a-6030-46c5-b394-e8f99e8b87db` | Template root YAML → `Template:` field |
| Template folder | `0437fee2-44c9-46a6-abe9-28858d9fee8c` | Category folders under templates |
| Field section template | `e269fbb5-3750-427a-9149-7aa950b49301` | Content/Data section YAML → `Template:` field |
| Field item template | `455a3e98-a627-4b40-8035-e683a0331ac7` | Individual field YAML → `Template:` field |
| View Rendering template | `04646a89-996f-4ee7-878a-ffdbf1f0ef0d` | Rendering definition YAML → `Template:` field |
| Rendering folder | `7ee0975b-0698-493e-b3a2-0b2ef33d0522` | Rendering category folders |

## Base Template GUIDs (for __Base template field)

| What | GUID | Required? |
|---|---|---|
| Standard template | `{1930BBEB-7805-471A-A3BE-4858AC7CF696}` | ALWAYS on custom templates |
| _PerSiteStandardValues | `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` | ALWAYS on datasource templates |

**CRITICAL:** Without `_PerSiteStandardValues`, layout service returns empty `rendered: {}`.

## Rendering Base Template

| What | GUID |
|---|---|
| Rendering base | `{0A98E368-CDB9-4E1E-927C-8E0C24A003FB}` |

## SharedField GUIDs (used in YAML SharedFields)

### Metadata Fields
| Hint | GUID |
|---|---|
| `__Sortorder` | `ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e` |
| `__Icon` | `06d5295c-ed2f-4a54-9bf2-26228d113318` |
| `__Base template` | `12c33f3f-86c5-43a5-aeb4-5598cec45116` |
| `__Standard values` | `f7d48a55-2158-4f02-9356-756654404f73` |
| `__Shared revision` | `dbbbeca1-21c7-4906-9dd2-493c1efa59a2` |
| `__Masters` | `1172f251-dad4-4efb-a329-0c63500e4f1e` |
| `__Default workflow` | `ca9b9f52-4fb0-4f87-a79f-24dea62cda65` |
| `__Subitems Sorting` | `6fd695e7-7f6d-4ca5-8b49-a829e5950ae9` |

### Field Definition Fields
| Hint | GUID |
|---|---|
| `Type` | `ab162cc0-dc80-4abf-8871-998ee5d7ba32` |
| `Title` | `19a69332-a23e-4e70-8d16-b2640cb24cc8` |
| `Source` | `1eb8ae32-e190-44a6-968d-ed904c794ebf` |
| `Enable Shared Language Fallback` | `24cb32f0-e364-4f37-b400-0f2899097b5b` |
| `__Display name` | `b5e02ad9-d56f-4c41-a065-a133db87bdeb` |

### Rendering Fields
| Hint | GUID |
|---|---|
| `Component Name` | `1845a951-d5b6-4a68-9ffb-41620125aaee` |
| `Datasource Location` | `b5b27af1-25ef-4e75-94e2-8274d8c1e4cd` |
| `Datasource Template` | `1a7c85e5-dc0b-4b1d-9b6e-5e5e5e5e5e5e` |
| `Renderings` (Available Renderings) | `715ae6c0-71c8-4744-ab4f-65362d20ad65` |

### Version Fields
| Hint | GUID |
|---|---|
| `__Created` | `25bed78c-4957-4165-998a-ca1b52f67497` |
| `__Created by` | `5dd74568-4d4b-44c1-b513-0af5f4cda34f` |
| `__Updated` | `d9cf14b1-fa16-4ba6-9288-e8a174d4d522` |
| `__Updated by` | `badd9cf9-53e0-4d0c-bcc0-2d784c282f6a` |
| `__Owner` | `52807595-0f8f-4b20-8d2a-cb71d28c6103` |
| `__Revision` | `8cdc337e-a112-42fb-bbb4-4143751e123f` |
| `__Lock` | `001dd393-96c5-490b-924a-b0f25cd9efd8` |
| `__Workflow state` | `3e431de1-525e-47a3-b6b0-1ccbec3a8c98` |

## Page Template GUIDs

| What | GUID |
|---|---|
| Page template (for datasource query) | `{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}` |
| Folder template | `fe5dd826-48c6-436d-b87a-7c4210c7413b` |

## Field Type Values (for Type SharedField)

| Value | Use for |
|---|---|
| `Single-Line Text` | Short text (headings, labels) |
| `Multi-Line Text` | Plain multi-line text |
| `Rich Text` | HTML content |
| `Image` | Image fields |
| `General Link` | Links (internal/external) |
| `Checkbox` | Boolean toggles |
| `Droplist` | Single selection from list |
| `Multilist` | Multiple selection (pipe-separated GUIDs) |
| `Multilist with Search` | Multiple selection with search |
| `Integer` | Whole numbers |
| `Number` | Decimal numbers |
| `Date` | Date values |
| `Datetime` | Date + time values |

## Datasource Query Pattern

Standard query for datasource location:
```
query:./ancestor-or-self::*[@@templateid='{2DC3AF7B-E9A5-44AD-A6E4-38069B5FFDDE}']/Data/{ComponentFolderName}
```

This navigates up to the nearest page, then into its `/Data/{folder}` child.
