# Skill: Pixel Validation (Phase 6)

Validate generated HTML/React against the original website using pixel comparison.

## Command

```bash
# Static HTML validation
node helpers/validate-components.js output/{domain} --viewport 1440 --threshold 85

# React app validation (requires Vite dev server on port 5174)
node helpers/validate-react.js output/{domain} --threshold 75 --page en
```

## How It Works

1. Screenshot original site at 1440, 768, 375px
2. Screenshot generated output at same viewports
3. For each component:
   - Crop original using `box.y, box.h` geometry
   - Crop generated using `data-component` element position
   - Compare with pixelmatch (threshold: 0.15 for HTML, 0.30 for React)
4. Report per-component match % + diff images

## Output

```
validation/
├── desktop/
│   ├── original-00-header.png
│   ├── generated-00-header.png
│   ├── diff-00-header.png
│   └── report.json
├── tablet/
└── mobile/
```

## Quality Signals

- **Full-page score >15% below per-component average** → spacing/gap issue between components
- **Card/image scores <30%** → likely missing `::before`/`::after` overlays
- **100% score with wrong content** → NOT a pass — must have visually correct content
- **Blank section matching blank crop** → cheating, not a pass

## Anti-Gaming Rules

1. A blank `<section>` matching a blank crop is NOT a pass
2. A component scoring 100% with wrong text content is NOT a pass
3. Every component must have visually correct content regardless of pixel score
4. If parallax breaks the crop, flag as "visual-only verification needed"
5. Visual inspection (screenshot review) is MANDATORY — pixel scores alone aren't enough

## AOS Neutralization

The validator automatically:
- Removes `data-aos` attributes
- Forces `opacity: 1` on all elements
- This prevents animation states from causing false failures

## React Validation Notes

- Vite dev server must be running on port 5174 SEPARATELY
- Validator connects to it, never starts/stops it
- Threshold is 0.30 (not 0.15) to account for font rendering differences
- Nested `<section>` tags cause phantom entries — use `<div>` for internals

## Rules

1. NEVER skip validation — it's mandatory after every generation phase
2. One fix category at a time after validation (see fix-loop.md)
3. Always re-validate after fixes — never assume a fix worked
4. Visual inspection + pixel score together — both required
