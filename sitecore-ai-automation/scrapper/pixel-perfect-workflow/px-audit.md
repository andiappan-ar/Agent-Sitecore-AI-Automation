# /px-audit — Phase 1: Design Token Audit

Analyze the CSS in the provided file and produce a design token audit.

Output a JSON block with these keys:
- spacing_base: smallest repeating spacing unit in px
- type_scale: all font-size values as px
- line_heights: all line-height values
- letter_spacings: all letter-spacing values
- colors: map of name/var → resolved hex
- border_radii: all border-radius values
- shadows: all box-shadow values verbatim
- box_sizing: content-box or border-box
- no_tailwind_equivalent: CSS properties with no direct Tailwind class

## RULES
- Do NOT convert anything. Only audit.
- Resolve all CSS custom properties to computed values.
- If spacing_base is not 4px or 8px, flag it prominently.
- After outputting the JSON, STOP and say:
  "✅ Token audit complete. Review the tokens above, then run `/px-config` to generate the Tailwind config."

Do NOT proceed to any other phase.

$ARGUMENTS
