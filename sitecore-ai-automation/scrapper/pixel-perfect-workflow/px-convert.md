# /px-convert — Phase 2: Strict Component Conversion

Convert the provided HTML/CSS to a React functional component using Tailwind CSS.

## STRICT RULES — no exceptions

1. EXACT VALUES ONLY — never approximate. 14px with no Tailwind shorthand → w-[14px]. Never round.
2. NO TAILWIND APPROXIMATION — if a CSS property can't be a Tailwind class, use inline style={{}}
3. FLAG EVERY DEVIATION — add inline comment on the JSX element:
   {/* UNMAPPED: box-shadow: 0 2px 8px rgba(0,0,0,0.12) — using inline style */}
4. PRESERVE LAYOUT MODEL — flex stays flex, grid stays grid. Never substitute.
5. BOX MODEL — match the source's box-sizing or override with inline style.
6. NO ABSTRACTIONS — single flat component. No sub-components, no hooks, no utility classes.
7. NO SEMANTIC REWRITES — div stays div, span stays span.

## Pre-output self-check (do this silently before showing code)

- Every px value has exact match?
- Every shadow is inline styled?
- Line-heights use leading-[Xpx]?
- Letter-spacing preserved?
- Font-smoothing inline styled if present?
- All UNMAPPED comments present?

## After converting
STOP and say:
"✅ Component converted. Please visually compare source vs output at 100% zoom.
When you have deltas, run `/px-fix` with the list of differences — one category at a time (spacing, typography, color, or layout)."

Do NOT self-fix. Wait for user-reported deltas.

$ARGUMENTS
