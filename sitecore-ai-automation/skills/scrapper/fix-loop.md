# Skill: Fix Loop (Phase 7)

Iterative fix workflow — one category at a time until all components pass validation.

## Fix Order (MANDATORY)

Fix ONE category at a time. Never fix multiple categories in a single iteration.

```
1. Layout    → container width, grid columns, flex direction
2. Spacing   → padding, margin, gap between components
3. Typography → font family, size, weight, line-height
4. Colors    → background, text, border colors
5. Images    → sizing, aspect ratio, object-fit
```

## Fix Iteration Workflow

```
FOR EACH category:
  1. Identify deltas visually (screenshot) AND from pixel scores
  2. Fix ONLY those deltas in code
  3. Re-validate + re-screenshot
  4. Verify BOTH:
     - Pixel score improved
     - Visual match is correct
  5. ONLY THEN move to next category
```

## Example Fix Flow

```
Iteration 1: Layout
  - Container too wide → add max-w-[1440px]
  - Grid 2-col instead of 3-col → lg:grid-cols-3
  - Re-validate → 65% → 78% ✓
  - Screenshot → correct ✓
  → Move to spacing

Iteration 2: Spacing
  - Section gap too small → py-[64px] instead of py-[24px]
  - Card gap wrong → gap-[24px] instead of gap-[16px]
  - Re-validate → 78% → 87% ✓
  → Move to typography

Iteration 3: Typography
  - Wrong font weight → font-[600] not font-bold
  - Line-height off → leading-[1.2]
  - Re-validate → 87% → 92% ✓
  → Move to colors

Iteration 4: Colors
  - Background off → bg-[#003f2d] not bg-green-900
  - Border color → border-[#cad1d3]
  - Re-validate → 92% → 95% ✓
  → DONE (above 85% threshold)
```

## Common Fixes

### Layout
- `flex-1` too wide → add `max-w-[Npx]`
- Missing `overflow-hidden` on carousel container
- `position: relative` needed for pseudo-element overlays

### Spacing
- Section padding wrong → check extraction `s.padding` exactly
- Gap between grid items → use `gap-[Npx]` from computed styles
- Negative margin needed for full-bleed sections

### Typography
- Font family not matching → check `s.font-family` in extraction
- Font size rounding → use EXACT value: `text-[19.5px]` not `text-xl`
- `hover:underline` on `inline-flex` → use `group` + `group-hover:underline` on inner span

### Colors
- Never use Tailwind named colors (bg-green-900) — use exact hex: `bg-[#003f2d]`
- Opacity on backgrounds → `style={{ backgroundColor: 'rgba(0,63,45,0.8)' }}`
- Border colors from extraction `s.border-color`

### Images
- Missing `object-cover` → images stretch
- Wrong aspect ratio → check `s.width` and `s.height` ratio
- Lazy-loaded images blank → extraction already forced loading

## Rules

1. **Never fix multiple categories at once** — cascading changes hide root causes
2. **Always re-validate after each fix** — never assume it worked
3. **Screenshot + pixel score** — both must confirm the fix
4. **One component at a time** if scores are very low
5. **Stop when above threshold** — 85% for HTML, 75% for React
