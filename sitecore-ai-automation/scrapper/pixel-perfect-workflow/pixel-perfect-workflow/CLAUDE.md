# CLAUDE.md — Pixel-Perfect Conversion Rules

## MANDATORY WORKFLOW GATES

When doing HTML → Tailwind React conversions, you MUST follow gated phases.
**Never combine phases. Never skip the verification step. Never auto-proceed.**

### Gate Rules

1. **STOP after each phase** — present your output and ask "Ready to proceed to Phase X?"
2. **Never convert and fix in the same response** — conversion (Phase 2) and fixing (Phase 3) are separate steps
3. **Never assume a fix worked** — after every fix, re-check the specific delta you fixed and confirm it's resolved before moving on
4. **One category of fix per iteration** — spacing fixes first, then typography, then color, then layout. Never mix.

---

## Phase 1: Token Audit (STOP GATE)

- Output the design token JSON
- List everything in `no_tailwind_equivalent`
- **STOP. Ask the user to confirm tokens before continuing.**

## Phase 4: Config Generation (STOP GATE)

- Generate `tailwind.config.js` extensions
- **STOP. Ask the user to review the config before continuing.**

## Phase 2: Strict Conversion (STOP GATE)

- Convert ONE component at a time
- Every value must be exact — use arbitrary syntax `[14px]` for non-standard values
- Flag every unmapped property with `{/* UNMAPPED: ... */}`
- **STOP. Present the component. Ask the user to visually compare before continuing.**

## Phase 3: Scoped Fix Loop (ITERATIVE — DO NOT RUSH)

This is the phase that gets skipped. Follow this loop strictly:

```
FOR EACH category (spacing → typography → color → shadows → layout):
  1. User reports deltas for this category
  2. Fix ONLY those specific deltas — change nothing else
  3. Show the exact lines changed (diff format)
  4. STOP — ask user to re-verify this category
  5. If new deltas found in this category, repeat from step 2
  6. Only move to next category after user confirms this one is clean
```

**Never say "I've fixed all the issues" without the user confirming each one.**

---

## ABSOLUTE PROHIBITIONS

- ❌ Never round a value to the nearest Tailwind step (e.g., 18px → mt-5)
- ❌ Never skip a CSS property because "it's close enough"
- ❌ Never batch multiple fix categories into one response
- ❌ Never rewrite the entire component during Phase 3 — line-level fixes only
- ❌ Never say "this should now match" — say "please verify these specific changes"
- ❌ Never use phrases like "approximately", "close to", "similar to"

## QUALITY CHECKLIST (run before presenting any output)

Before showing converted code, silently verify:
- [ ] Every px value in source has an exact match (class or arbitrary)
- [ ] Every shadow uses inline style, not Tailwind shadow class
- [ ] Line-heights use `leading-[Xpx]` not Tailwind's unitless defaults
- [ ] Letter-spacing is preserved (often dropped silently)
- [ ] Font-smoothing / font-feature-settings are inline styled if present
- [ ] Box-sizing matches source (content-box vs border-box)
- [ ] Layout model preserved (flex stays flex, grid stays grid, block stays block)
- [ ] No semantic element changes (div stays div, span stays span)
- [ ] All UNMAPPED comments are present for inline-styled properties
