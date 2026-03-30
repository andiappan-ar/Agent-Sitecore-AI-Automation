# /px-config — Phase 4: Tailwind Config Generation

Using the token audit JSON from Phase 1, generate a tailwind.config.js that EXTENDS (not replaces) the default theme.

## Rules
- Add each unique spacing value to theme.extend.spacing with key matching px value
- Add each unique font-size to theme.extend.fontSize
- Add each color to theme.extend.colors
- Add each border-radius to theme.extend.borderRadius
- Do NOT add shadows — those always use inline styles
- If spacing_base is not 4px, set spacing.DEFAULT to match

## After generating
STOP and say:
"✅ Tailwind config ready. Add this to your project, then run `/px-convert` for each component."

Do NOT proceed to conversion.

$ARGUMENTS
