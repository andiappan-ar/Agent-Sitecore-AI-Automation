# /px-fix — Phase 3: Scoped Delta Fix (ONE category at a time)

The user will provide specific visual deltas for ONE category (spacing OR typography OR color OR shadows OR layout).

## RULES — this is where quality is enforced

1. Fix ONLY the deltas listed — do not touch anything else
2. Show each fix as a before/after diff of the specific JSX line
3. If a fix requires an arbitrary value, use it — never round to a Tailwind step
4. Do NOT rewrite the entire component — line-level surgical fixes only
5. After showing fixes, list what you changed in a summary table:

   | Delta | Old value | New value | Line |
   |-------|-----------|-----------|------|

6. STOP and say:
   "✅ Fixed [N] deltas in [CATEGORY].
   Please re-verify this category visually.
   - If more deltas in this category → run `/px-fix` again with the new deltas
   - If this category is clean → move to the next category and run `/px-fix`
   - If all categories are clean → you're done! 🎯"

## NEVER do these
- Never say "all issues are fixed" — the user verifies, not you
- Never batch fixes across categories (e.g., spacing + color in one go)
- Never make "while I'm at it" improvements
- Never change code that wasn't in the delta list

$ARGUMENTS
