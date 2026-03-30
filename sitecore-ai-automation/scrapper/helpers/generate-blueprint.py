"""
generate-blueprint.py v4

Converts extracted DOM JSON + design tokens into blueprint HTML + CSS.

Architecture:
- Reads design-system.json for CSS custom properties, font-faces, typography, buttons
- Reads page-*.json for component trees (compact format: s/t/c keys, kebab-case)
- Generates style.css dynamically from tokens (zero hardcoded values)
- Generates components.css dynamically from tokens
- Per-component handlers extract content → fill HTML templates
- Unknown components use inline-style fallback renderer

Data format contract (from extract-components.js):
  node = { tag, s: {kebab-case CSS}, t: "text", c: [children] }
  img: { src, alt }  |  a: { href }  |  svg: { svg }
  video: { vsrc, poster }  |  input/textarea: { type, placeholder, name }
"""

import json
import re
import sys
import shutil
from pathlib import Path
from html import escape
from typing import Optional


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


# ═══════════════════════════════ TREE HELPERS ═══════════════════════════════

def children(node: dict) -> list:
    return node.get('c', [])


def child_at(node: dict, *indices) -> Optional[dict]:
    current = node
    for i in indices:
        kids = children(current)
        if not kids or i >= len(kids):
            return None
        current = kids[i]
    return current


def find_tag(node: dict, tag: str) -> Optional[dict]:
    if node.get('tag') == tag:
        return node
    for c in children(node):
        found = find_tag(c, tag)
        if found:
            return found
    return None


def find_all_tags(node: dict, tag: str) -> list:
    results = []
    if node.get('tag') == tag:
        results.append(node)
    for c in children(node):
        results.extend(find_all_tags(c, tag))
    return results


def get_text(node: dict) -> str:
    return (node.get('t') or '').strip()


def get_deep_text(node: dict) -> str:
    parts = []
    t = get_text(node)
    if t:
        parts.append(t)
    for c in children(node):
        parts.append(get_deep_text(c))
    return ' '.join(p for p in parts if p).strip()


def get_img(node: dict) -> dict:
    return {'src': node.get('src', ''), 'alt': node.get('alt', '')}


def find_first_img(node: dict) -> Optional[dict]:
    img = find_tag(node, 'img')
    return get_img(img) if img else None


def find_all_imgs(node: dict) -> list:
    return [get_img(n) for n in find_all_tags(node, 'img')]


def get_svg(node: dict) -> str:
    return node.get('svg', '')


def find_first_svg(node: dict) -> str:
    svg_node = find_tag(node, 'svg')
    return get_svg(svg_node) if svg_node else ''


def find_all_svgs(node: dict) -> list:
    return [get_svg(n) for n in find_all_tags(node, 'svg')]


def get_style(node: dict, key: str) -> str:
    return (node.get('s') or {}).get(key, '')


def find_by_style(node: dict, key: str, value: str) -> Optional[dict]:
    sv = get_style(node, key)
    if sv and value in sv:
        return node
    for c in children(node):
        found = find_by_style(c, key, value)
        if found:
            return found
    return None


def find_by_display(node: dict, display: str) -> Optional[dict]:
    return find_by_style(node, 'display', display)


def esc(text: str) -> str:
    return escape(text) if text else ''


def count_descendants(node: dict) -> int:
    """Count total descendant nodes."""
    total = 0
    for c in children(node):
        total += 1 + count_descendants(c)
    return total


def find_largest_text(node: dict, prop: str = 'font-size') -> tuple:
    """Find the node with the largest font-size value. Returns (node, px_value)."""
    best_node = None
    best_val = 0.0
    val_str = get_style(node, prop)
    if val_str and val_str.endswith('px'):
        try:
            v = float(val_str.replace('px', ''))
            if v > best_val:
                best_val = v
                best_node = node
        except ValueError:
            pass
    for c in children(node):
        child_node, child_val = find_largest_text(c, prop)
        if child_val > best_val:
            best_val = child_val
            best_node = child_node
    return best_node, best_val


# ═══════════════════════════════ DESIGN TOKEN LOADER ═══════════════════════════

class DesignTokens:
    """Loads and provides access to design-system.json tokens."""

    def __init__(self, data: dict):
        self.raw = data
        self.colors = data.get('colors', [])
        self.typography = data.get('typography', [])
        self.font_faces = data.get('fontFaces', [])
        self.spacing = data.get('spacing', {})
        self.border_radii = data.get('borderRadii', [])
        self.buttons = data.get('buttons', [])
        self.shadows = data.get('shadows', [])
        self.breakpoints = data.get('breakpoints', [])
        self.css_variables = data.get('cssVariables', [])
        self.meta = data.get('meta', {})

    @classmethod
    def empty(cls):
        return cls({})

    @classmethod
    def from_file(cls, path: Path):
        if path.exists():
            return cls(load_json(path))
        return cls.empty()

    # ── Color helpers ────────────────────────────────────────────
    def rgb_to_hex(self, rgb: str) -> str:
        m = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', rgb)
        if not m:
            return rgb
        return '#{:02x}{:02x}{:02x}'.format(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    def top_colors_by_usage(self, prop: str, limit: int = 5) -> list:
        """Get top N colors used for a specific CSS property (e.g. 'color', 'backgroundColor')."""
        results = []
        for c in self.colors:
            used = c.get('usedFor', '')
            if prop in used:
                # Parse count from "color(210)" format
                m = re.search(rf'{prop}\((\d+)\)', used)
                count = int(m.group(1)) if m else 0
                results.append((c['value'], count))
        results.sort(key=lambda x: -x[1])
        return results[:limit]

    def primary_text_color(self) -> str:
        """Most-used text color (not white/black)."""
        for val, _ in self.top_colors_by_usage('color', 20):
            hex_val = self.rgb_to_hex(val)
            if hex_val not in ('#ffffff', '#000000', '#f8f8f8'):
                return val
        return 'rgb(0, 0, 0)'

    def primary_bg_color(self) -> str:
        """Most-used non-white background color."""
        for val, _ in self.top_colors_by_usage('backgroundColor', 20):
            hex_val = self.rgb_to_hex(val)
            if hex_val not in ('#ffffff', '#000000', 'rgba(0, 0, 0, 0)'):
                return val
        return 'rgb(0, 0, 0)'

    def primary_font_family(self) -> str:
        """Primary font from fontFaces, excluding icon fonts."""
        skip = {'swiper-icons', 'fontawesome', 'fa ', 'icon', 'material'}
        for ff in self.font_faces:
            family = ff.get('family', '').strip()
            if family and not any(s in family.lower() for s in skip):
                return family
        # Fallback: from most common typography entry
        if self.typography:
            return self.typography[0].get('fontFamily', 'sans-serif').split(',')[0].strip().strip("'\"")
        return 'sans-serif'

    def container_max_width(self) -> str:
        c = self.spacing.get('container', {})
        return c.get('maxWidth', 'none')

    def container_padding(self) -> str:
        c = self.spacing.get('container', {})
        p = c.get('padding', '0px')
        # Extract horizontal padding from "Xpx Ypx" or "Xpx Ypx Zpx Wpx"
        parts = p.split()
        if len(parts) >= 2:
            return parts[1]
        return p

    def body_typography(self) -> dict:
        """Get the most common body typography (16px preferred, then 14px/15px)."""
        # Prefer 16px with weight 400 (normal body text)
        for t in sorted(self.typography, key=lambda x: -x.get('count', 0)):
            fs = t.get('fontSize', '')
            fw = t.get('fontWeight', '400')
            if fs == '16px' and fw in ('400', '300', 'normal'):
                return t
        # Fallback: any 16px
        for t in self.typography:
            if t.get('fontSize') == '16px':
                return t
        # Fallback: any 14-15px
        for t in sorted(self.typography, key=lambda x: -x.get('count', 0)):
            fs = t.get('fontSize', '')
            if fs in ('14px', '15px'):
                return t
        return {'fontSize': '16px', 'fontWeight': '400', 'lineHeight': '24px'}

    # ── CSS generation ───────────────────────────────────────────
    def generate_root_variables(self) -> str:
        """Generate :root CSS custom properties from tokens."""
        lines = [':root {']

        # Colors — assign semantic names
        primary_text = self.primary_text_color()
        primary_bg = self.primary_bg_color()
        seen_colors = set()

        lines.append('  /* Colors — from getComputedStyle extraction */')
        lines.append(f'  --color-primary: {primary_text};')
        seen_colors.add(primary_text)
        lines.append(f'  --color-accent: {primary_bg};')
        seen_colors.add(primary_bg)
        lines.append(f'  --color-white: #ffffff;')
        lines.append(f'  --color-black: #000000;')

        # Top remaining colors
        for i, c in enumerate(self.colors[:20]):
            val = c['value']
            if val in seen_colors:
                continue
            hex_val = self.rgb_to_hex(val)
            if hex_val in ('#ffffff', '#000000', 'rgba(0, 0, 0, 0)'):
                continue
            seen_colors.add(val)
            lines.append(f'  --color-{i + 1}: {val};')

        # Layout
        lines.append('')
        lines.append('  /* Layout */')
        max_w = self.container_max_width()
        pad_x = self.container_padding()
        lines.append(f'  --max-w: {max_w};')
        lines.append(f'  --pad-x: {pad_x};')

        # Spacing — from gaps
        gaps = self.spacing.get('gaps', [])
        if gaps:
            lines.append('')
            lines.append('  /* Gaps — by frequency */')
            for i, g in enumerate(gaps[:8]):
                lines.append(f'  --gap-{i + 1}: {g["value"]};')

        # Section paddings
        section_pads = self.spacing.get('paddings', [])
        if section_pads:
            lines.append('')
            lines.append('  /* Section paddings */')
            for i, p in enumerate(section_pads[:5]):
                lines.append(f'  --section-pad-{i + 1}: {p["value"]};')

        # Border radii
        if self.border_radii:
            lines.append('')
            lines.append('  /* Border radii */')
            for i, r in enumerate(self.border_radii[:6]):
                lines.append(f'  --radius-{i + 1}: {r["value"]};')

        # Also output any site-defined CSS variables
        if self.css_variables:
            lines.append('')
            lines.append('  /* Site CSS variables */')
            for v in self.css_variables[:30]:
                lines.append(f'  {v["name"]}: {v["value"]};')

        lines.append('}')
        return '\n'.join(lines)

    def generate_typography_classes(self) -> str:
        """Generate typography utility classes from extracted data."""
        lines = ['/* Typography utilities — from getComputedStyle extraction */']

        # Group by approximate role
        for i, t in enumerate(self.typography[:15]):
            fs = t.get('fontSize', '16px')
            fw = t.get('fontWeight', '400')
            lh = t.get('lineHeight', 'normal')
            tt = t.get('textTransform', 'none')
            ls = t.get('letterSpacing', 'normal')
            tags = t.get('tags', {})
            count = t.get('count', 0)

            # Determine class name from tag usage
            tag_names = sorted(tags.keys(), key=lambda k: -tags[k])
            primary_tag = tag_names[0] if tag_names else 'P'

            if primary_tag in ('H1', 'H2', 'H3', 'H4', 'H5', 'H6'):
                cls_name = f't-{primary_tag.lower()}'
            else:
                fs_num = fs.replace('px', '')
                cls_name = f't-size-{fs_num}'

            rule = f'.{cls_name} {{ font-size: {fs}; font-weight: {fw}; line-height: {lh};'
            if tt != 'none':
                rule += f' text-transform: {tt};'
            if ls != 'normal':
                rule += f' letter-spacing: {ls};'
            rule += f' }} /* {count}x usage, tags: {", ".join(tag_names)} */'
            lines.append(rule)

        # Color utilities
        lines.append('')
        lines.append(f'.t-white {{ color: var(--color-white); }}')
        lines.append(f'.t-primary {{ color: var(--color-primary); }}')
        lines.append(f'.t-accent {{ color: var(--color-accent); }}')

        return '\n'.join(lines)

    def generate_button_classes(self) -> str:
        """Generate button utility classes from extracted data."""
        if not self.buttons:
            return '/* No buttons extracted */'

        lines = ['/* Button utilities — from getComputedStyle extraction */']

        for i, btn in enumerate(self.buttons[:10]):
            cls = f'btn-{i + 1}'
            parts = [f'  display: inline-flex', '  align-items: center', '  justify-content: center']
            if btn.get('padding'): parts.append(f'  padding: {btn["padding"]}')
            if btn.get('borderRadius'): parts.append(f'  border-radius: {btn["borderRadius"]}')
            if btn.get('backgroundColor') and btn['backgroundColor'] != 'rgba(0, 0, 0, 0)':
                parts.append(f'  background-color: {btn["backgroundColor"]}')
            if btn.get('color'): parts.append(f'  color: {btn["color"]}')
            if btn.get('fontSize'): parts.append(f'  font-size: {btn["fontSize"]}')
            if btn.get('fontWeight'): parts.append(f'  font-weight: {btn["fontWeight"]}')
            parts.append('  border: none')
            parts.append('  cursor: pointer')
            parts.append('  font-family: inherit')

            text = btn.get('text', '')
            count = btn.get('count', 0)
            lines.append(f'.{cls} {{ /* "{text}" — {count}x */')
            lines.extend(f'{p};' for p in parts)
            lines.append('}')

        return '\n'.join(lines)

    def generate_layout_classes(self) -> str:
        """Generate layout utility classes."""
        return f"""/* Layout utilities */
.container {{
  max-width: var(--max-w);
  margin: 0 auto;
  width: 100%;
  padding: 0 var(--pad-x);
}}
.container--flex {{ display: flex; flex-direction: column; }}
.container--gap-1 {{ gap: var(--gap-1, 24px); }}
.container--gap-2 {{ gap: var(--gap-2, 40px); }}
.container--gap-3 {{ gap: var(--gap-3, 80px); }}
"""

    def generate_font_faces(self) -> str:
        """Generate @font-face declarations."""
        if not self.font_faces:
            return ''
        lines = []
        skip = {'swiper-icons', 'fontawesome'}
        seen = set()
        for ff in self.font_faces:
            family = ff.get('family', '').strip()
            if not family or family.lower() in skip:
                continue
            weight = ff.get('weight', '400')
            src = ff.get('src', '')
            style = ff.get('style', 'normal')
            key = f'{family}-{weight}-{style}'
            if key in seen:
                continue
            seen.add(key)
            lines.append(f"@font-face {{")
            lines.append(f"  font-family: '{family}';")
            lines.append(f"  src: {src};")
            lines.append(f"  font-weight: {weight};")
            lines.append(f"  font-style: {style};")
            lines.append(f"}}")
            lines.append('')
        return '\n'.join(lines)

    def generate_style_css(self) -> str:
        """Generate the base style.css from tokens."""
        font_faces = self.generate_font_faces()
        primary_font = self.primary_font_family()
        primary_color = self.primary_text_color()
        body = self.body_typography()

        primary_color_hex = self.rgb_to_hex(primary_color)

        return f"""/* style.css — Auto-generated from design-system.json extraction */
{font_faces}
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ overflow-x: hidden; max-width: 100vw; }}
body {{
  font-family: '{primary_font}', Arial, sans-serif;
  color: {primary_color_hex};
  font-size: {body.get('fontSize', '16px')};
  font-weight: {body.get('fontWeight', '400')};
  line-height: {body.get('lineHeight', '24px')};
}}
img {{ max-width: 100%; height: auto; display: block; }}
a {{ text-decoration: none; color: inherit; }}
button {{ font-family: inherit; cursor: pointer; border: none; background: none; }}
svg {{ display: block; }}
video {{ display: block; width: 100%; height: 100%; object-fit: cover; }}
"""

    def generate_components_css(self) -> str:
        """Generate the full components.css from tokens."""
        parts = [
            '/* components.css — Auto-generated from design-system.json extraction */',
            '/* Every value comes from getComputedStyle() — zero hardcoded values */',
            '',
            self.generate_root_variables(),
            '',
            self.generate_typography_classes(),
            '',
            self.generate_button_classes(),
            '',
            self.generate_layout_classes(),
        ]
        return '\n\n'.join(parts)


# ═══════════════════════════════ PIXEL-PERFECT RENDERER ═══════════════════════════
#
# Philosophy: REPRODUCE, don't interpret.
# Every extracted style is output as-is. The extraction script (extract-components.js)
# handles AOS/animation cleanup BEFORE capturing. This renderer trusts the extraction.
#
# KEY CHANGE (v5): Uses CSS classes instead of inline styles so that @media queries
# can override values for responsive viewports. Each element gets a unique class (n1, n2...),
# and all styles go into a <style> block with responsive overrides.

# Properties that are pure noise — never affect visual output in a static blueprint
NOISE_PROPS = {
    'cursor',        # interaction, not visual
    'transition',    # animation
    'word-break',    # rarely visual
}

# Inherited typography props — skip if same as parent to reduce CSS size
INHERITED_TYPO = {'color', 'font-size', 'font-weight', 'line-height', 'font-family'}

# Properties that need responsive scaling
RESPONSIVE_PROPS = {
    'font-size', 'line-height', 'padding', 'margin', 'gap',
    'grid-template-columns', 'grid-template-rows', 'width', 'height',
    'max-width', 'min-height', 'top', 'left', 'right', 'bottom',
    'flex-direction', 'display',
}


class StyleCollector:
    """Collects styles from nodes and generates CSS classes with responsive overrides."""

    def __init__(self, responsive_data: dict = None):
        self._counter = 0
        self._desktop_rules = []  # list of (class_name, css_props_str)
        self._tablet_overrides = []  # @media (max-width: 1024px) rules
        self._mobile_overrides = []  # @media (max-width: 640px) rules
        self._responsive = responsive_data or {}

    def next_class(self) -> str:
        self._counter += 1
        return f'n{self._counter}'

    def add_styles(self, class_name: str, styles: dict, is_section: bool = False,
                   parent_styles: dict = None) -> None:
        """Register desktop styles and auto-generate responsive overrides."""
        if not styles:
            return
        desktop_parts = []
        tablet_parts = []
        mobile_parts = []

        # Pre-process: drop aspect-ratio when object-fit:cover is set
        # object-fit:cover handles aspect by cropping; CSS aspect-ratio forces element resize
        has_object_fit_cover = styles.get('object-fit') == 'cover'

        for key, val in styles.items():
            if not val or key in NOISE_PROPS:
                continue

            # Drop aspect-ratio for cover images — it conflicts with fixed dimensions
            if key == 'aspect-ratio' and has_object_fit_cover:
                continue

            # Skip inherited typography if identical to parent
            if parent_styles and key in INHERITED_TYPO:
                if parent_styles.get(key) == val:
                    continue

            # Width/height that matches viewport extraction size should be 100%
            # These elements are meant to fill their parent — not be a fixed pixel size
            if key == 'width' and val.endswith('px'):
                try:
                    wpx = float(val.replace('px', ''))
                    is_abs_or_fixed = styles.get('position') in ('absolute', 'fixed')
                    has_inset = styles.get('inset') == '0' and is_abs_or_fixed
                    # Only absolute/fixed elements with inset:0 are true overlays
                    # relative/static elements have inset:0 as the default computed value
                    is_fill_element = has_inset or (is_abs_or_fixed and wpx >= 1400)
                    if is_section:
                        # Sections: full width, no max-width (they're the outer shell)
                        desktop_parts.append('width: 100%')
                        continue
                    elif is_fill_element:
                        # Overlay/fill elements (abs/rel/fixed with inset:0)
                        # must fill their parent — never cap with max-width
                        # flex-shrink:0 + min-width ensures they don't get squished in flex containers
                        desktop_parts.append('width: 100%')
                        desktop_parts.append('min-width: 100%')
                        continue
                    elif wpx >= 1400 and wpx <= 1500:
                        # Distinguish edge-to-edge containers from centered content:
                        # - Edge-to-edge: small padding (< 60px), should stay full-width
                        # - Centered content: large padding (>= 60px), cap at 1440px
                        pad = styles.get('padding', '0px')
                        pad_parts = pad.replace('px', '').split()
                        h_pad = float(pad_parts[1]) if len(pad_parts) >= 2 else float(pad_parts[0])
                        if h_pad < 60:
                            # Edge-to-edge container (like header nav)
                            desktop_parts.append('width: 100%')
                        else:
                            # Centered content container
                            desktop_parts.append('width: 100%')
                            desktop_parts.append('max-width: 1440px')
                            desktop_parts.append('margin-left: auto')
                            desktop_parts.append('margin-right: auto')
                        continue
                    elif wpx >= 1050 and wpx < 1400:
                        # Content-width containers: center on wider screens
                        # BUT not if parent is flex — flex children are positioned by the parent
                        parent_is_flex = parent_styles and parent_styles.get('display') == 'flex'
                        desktop_parts.append(f'width: {val}')
                        if not is_abs_or_fixed and not has_inset and not parent_is_flex and 'margin' not in styles:
                            desktop_parts.append('max-width: 100%')
                            desktop_parts.append('margin-left: auto')
                            desktop_parts.append('margin-right: auto')
                        continue
                except ValueError:
                    pass

            if key == 'height' and val.endswith('px'):
                has_inset = styles.get('inset') == '0'
                is_abs = styles.get('position') == 'absolute'
                if is_abs and has_inset:
                    desktop_parts.append('height: 100%')
                    continue

            # Normalize identity transforms
            if key == 'transform' and val in ('matrix(1, 0, 0, 1, 0, 0)', 'none'):
                continue

            # Container max-width: keep for centering but ensure fluid
            if key == 'max-width' and 'px' in val:
                is_abs_fixed = styles.get('position') in ('absolute', 'fixed')
                has_inset_mw = styles.get('inset') == '0' and is_abs_fixed
                is_fill_mw = is_abs_fixed or has_inset_mw
                try:
                    mw = float(val.replace('px', ''))
                    if mw >= 1400:
                        if is_section or is_fill_mw:
                            # Sections and fill/overlay elements: no max-width cap
                            desktop_parts.append('max-width: 100%')
                        else:
                            # Normal-flow containers: cap at 1440px and center
                            desktop_parts.append('max-width: 1440px')
                            if 'margin' not in styles:
                                desktop_parts.append('margin-left: auto')
                                desktop_parts.append('margin-right: auto')
                        continue
                    elif mw >= 1200:
                        desktop_parts.append(f'max-width: {val}')
                        if 'margin' not in styles:
                            desktop_parts.append('margin: 0 auto')
                            desktop_parts.append('width: 100%')
                        tablet_parts.append('max-width: 100%')
                        continue
                except ValueError:
                    pass

            desktop_parts.append(f'{key}: {val}')

            # ── Auto-generate responsive overrides ──
            if key in RESPONSIVE_PROPS:
                self._add_responsive_override(key, val, tablet_parts, mobile_parts)

        # Elements with aspect-ratio but no explicit width collapse in flex containers
        # Give them width:100% so they fill their parent
        if styles.get('aspect-ratio') and 'width' not in styles:
            desktop_parts.append('width: 100%')

        # Fill-element flex containers (inset:0 + abs/fixed + flex) are likely slider tracks
        # Add overflow:hidden so only one slide is visible
        display = styles.get('display', '')
        is_abs_fixed_flex = styles.get('position') in ('absolute', 'fixed')
        has_inset_flex = styles.get('inset') == '0' and is_abs_fixed_flex
        if display == 'flex' and has_inset_flex and 'overflow' not in styles:
            desktop_parts.append('overflow: hidden')

        # Flex row containers with large widths should wrap/stack on mobile
        flex_dir = styles.get('flex-direction', '')
        if display == 'flex' and flex_dir != 'column':
            w = styles.get('width', '')
            if w.endswith('px'):
                try:
                    wpx = float(w.replace('px', ''))
                    if wpx > 1440:
                        # Carousel/swiper track — wider than viewport, needs clipping
                        # Don't add responsive overrides, just ensure overflow:hidden on parent
                        pass
                    elif wpx > 600:
                        tablet_parts.append('flex-wrap: wrap')
                        mobile_parts.append('flex-direction: column')
                except ValueError:
                    pass

        # Any element wider than viewport needs overflow:hidden
        w = styles.get('width', '')
        if w.endswith('px') and not is_section:
            try:
                wpx = float(w.replace('px', ''))
                if wpx > 1500 and 'overflow' not in styles:
                    desktop_parts.append('overflow: hidden')
            except ValueError:
                pass

        if desktop_parts:
            self._desktop_rules.append((class_name, '; '.join(desktop_parts)))
        if tablet_parts:
            self._tablet_overrides.append((class_name, '; '.join(tablet_parts)))
        if mobile_parts:
            self._mobile_overrides.append((class_name, '; '.join(mobile_parts)))

    def _add_responsive_override(self, key: str, val: str,
                                  tablet_parts: list, mobile_parts: list) -> None:
        """Generate responsive overrides for properties that need scaling."""
        # Font-size scaling
        if key == 'font-size' and val.endswith('px'):
            try:
                px = float(val.replace('px', ''))
                if px >= 60:
                    tablet_parts.append(f'font-size: {px * 0.57:.0f}px')
                    mobile_parts.append(f'font-size: {px * 0.43:.0f}px')
                elif px >= 40:
                    tablet_parts.append(f'font-size: {px * 0.67:.0f}px')
                    mobile_parts.append(f'font-size: {px * 0.5:.0f}px')
                elif px >= 32:
                    tablet_parts.append(f'font-size: {px * 0.75:.0f}px')
                    mobile_parts.append(f'font-size: {px * 0.625:.0f}px')
            except ValueError:
                pass

        # Line-height scaling (proportional to font-size)
        if key == 'line-height' and val.endswith('px'):
            try:
                px = float(val.replace('px', ''))
                if px >= 60:
                    tablet_parts.append(f'line-height: {px * 0.57:.0f}px')
                    mobile_parts.append(f'line-height: {px * 0.43:.0f}px')
                elif px >= 40:
                    tablet_parts.append(f'line-height: {px * 0.67:.0f}px')
                    mobile_parts.append(f'line-height: {px * 0.5:.0f}px')
                elif px >= 32:
                    tablet_parts.append(f'line-height: {px * 0.75:.0f}px')
                    mobile_parts.append(f'line-height: {px * 0.625:.0f}px')
            except ValueError:
                pass

        # Grid columns: collapse to fewer columns
        if key == 'grid-template-columns':
            col_count = val.count('px')
            if col_count >= 4:
                tablet_parts.append('grid-template-columns: 1fr 1fr')
                mobile_parts.append('grid-template-columns: 1fr')
            elif col_count >= 3:
                tablet_parts.append('grid-template-columns: 1fr 1fr')
                mobile_parts.append('grid-template-columns: 1fr')
            elif col_count >= 2:
                mobile_parts.append('grid-template-columns: 1fr')

        # Grid rows: auto when collapsing columns
        if key == 'grid-template-rows':
            tablet_parts.append('grid-template-rows: auto')
            mobile_parts.append('grid-template-rows: auto')

        # Padding: scale horizontal padding
        if key == 'padding' and 'px' in val:
            parts = val.split()
            if len(parts) >= 2:
                try:
                    # Check if horizontal padding is large
                    h_pad = float(parts[1].replace('px', '')) if parts[1].endswith('px') else 0
                    if h_pad >= 100:
                        tablet_parts.append(f'padding: {parts[0]} 40px' + (f' {parts[2]}' if len(parts) > 2 else ''))
                        mobile_parts.append(f'padding: {parts[0]} 20px' + (f' {parts[2]}' if len(parts) > 2 else ''))
                    elif h_pad >= 40:
                        mobile_parts.append(f'padding: {parts[0]} 20px' + (f' {parts[2]}' if len(parts) > 2 else ''))
                except (ValueError, IndexError):
                    pass

        # Position offsets: scale absolute positioning on small screens
        if key in ('right', 'left') and val.endswith('px'):
            try:
                px = float(val.replace('px', ''))
                if px > 200:
                    mobile_parts.append(f'{key}: 20px')
                elif px > 50:
                    mobile_parts.append(f'{key}: 10px')
            except ValueError:
                pass

        # Width/Height: prevent overflow
        if key == 'width' and val.endswith('px'):
            try:
                px = float(val.replace('px', ''))
                if px > 768:
                    tablet_parts.append('width: 100%')
                    mobile_parts.append('width: 100%')
                elif px > 375:
                    mobile_parts.append('width: 100%')
            except ValueError:
                pass

        if key == 'height' and val.endswith('px'):
            try:
                px = float(val.replace('px', ''))
                if px > 600:
                    tablet_parts.append(f'height: auto')
                    tablet_parts.append(f'min-height: {px * 0.6:.0f}px')
                    mobile_parts.append(f'height: auto')
                    mobile_parts.append(f'min-height: {px * 0.4:.0f}px')
            except ValueError:
                pass

    def generate_css(self) -> str:
        """Generate full CSS with desktop + responsive rules."""
        lines = ['/* Auto-generated element styles — pixel-perfect from extraction */']

        # Desktop rules
        for cls, props in self._desktop_rules:
            lines.append(f'.{cls} {{ {props} }}')

        # Global responsive safety rules
        lines.append('')
        lines.append('/* Global responsive safety */')
        lines.append('@media (max-width: 768px) {')
        lines.append('  [data-component] { overflow: hidden; max-width: 100vw; }')
        lines.append('}')
        lines.append('@media (max-width: 640px) {')
        lines.append('  img { max-width: 100% !important; height: auto !important; }')
        lines.append('  svg { max-width: 100%; }')
        lines.append('  [data-component] > * { max-width: 100%; }')
        lines.append('  [style*="position: absolute"], [class] { max-width: 100vw; }')
        lines.append('  fieldset, form, iframe { max-width: 100% !important; }')
        lines.append('}')

        # Tablet overrides
        if self._tablet_overrides:
            lines.append('')
            lines.append('/* Tablet overrides */')
            lines.append('@media (max-width: 1024px) {')
            for cls, props in self._tablet_overrides:
                lines.append(f'  .{cls} {{ {props} }}')
            lines.append('}')

        # Mobile overrides
        if self._mobile_overrides:
            lines.append('')
            lines.append('/* Mobile overrides */')
            lines.append('@media (max-width: 640px) {')
            for cls, props in self._mobile_overrides:
                lines.append(f'  .{cls} {{ {props} }}')
            lines.append('}')

        return '\n'.join(lines)


def node_to_html(node: dict, depth: int = 0, parent_styles: dict = None,
                 collector: StyleCollector = None) -> str:
    """Pixel-perfect renderer: outputs every element with CSS class + extracted styles."""
    if not node:
        return ''
    tag = node.get('tag', 'div')
    indent = '  ' * depth
    styles = node.get('s', {})

    # Skip truly hidden elements — but preserve hidden interactive content
    is_hidden_interactive = node.get('hidden', False)
    if styles.get('display') == 'none' and not is_hidden_interactive:
        return ''
    # Skip off-screen translated elements (inactive carousel slides)
    # But preserve elements flagged as hidden interactive content (tab panes)
    transform = styles.get('transform', '')
    if transform and 'matrix' in transform and transform != 'matrix(1, 0, 0, 1, 0, 0)':
        # Parse matrix(a,b,c,d,tx,ty) — skip if translateX or translateY > 500px
        m = re.match(r'matrix\(([^)]+)\)', transform)
        if m:
            parts = [float(x.strip()) for x in m.group(1).split(',')]
            if len(parts) == 6:
                tx, ty = abs(parts[4]), abs(parts[5])
                if (tx > 500 or ty > 500) and not is_hidden_interactive:
                    return ''  # Off-screen — skip
                elif tx > 500 or ty > 500:
                    # Hidden interactive content — render in-flow, remove transform
                    styles = dict(styles)  # copy to avoid mutation
                    styles.pop('transform', None)
    if styles.get('opacity') == '0':
        if transform and 'matrix' in transform and not is_hidden_interactive:
            return ''

    attrs = []
    comp_name = node.get('componentName')
    if comp_name:
        attrs.append(f'data-component="{esc(comp_name)}"')

    # Generate unique class and register styles
    if collector and styles:
        cls_name = collector.next_class()
        collector.add_styles(cls_name, styles, is_section=bool(comp_name),
                           parent_styles=parent_styles)
        attrs.append(f'class="{cls_name}"')

    attr_str = (' ' + ' '.join(attrs)) if attrs else ''

    # ── Self-closing / special tags ──
    if tag == 'img':
        # Cover images inside fill containers should stretch to fill parent
        # BUT only large images (>200px) — small icons with object-fit:cover should keep their size
        img_w = styles.get('width', '0px')
        img_w_px = float(img_w.replace('px', '')) if img_w.endswith('px') else 0
        if styles.get('object-fit') == 'cover' and collector and img_w_px > 200:
            extra_style = 'width:100%;height:100%;object-fit:cover;'
            return f'{indent}<img src="{node.get("src", "")}" alt="{esc(node.get("alt", ""))}"{attr_str} style="{extra_style}">'
        return f'{indent}<img src="{node.get("src", "")}" alt="{esc(node.get("alt", ""))}"{attr_str}>'
    if tag == 'svg':
        svg_html = node.get('svg', '')
        # Wrap SVG in a sized container using extracted styles (width/height)
        if collector and styles:
            cls_name = collector.next_class()
            collector.add_styles(cls_name, styles, parent_styles=parent_styles)
            # Strip Tailwind utility classes from SVG and set explicit dimensions
            svg_html = re.sub(r'\bclass="[^"]*"', '', svg_html, count=1)
            return f'{indent}<div class="{cls_name}" style="display:inline-flex">{svg_html}</div>'
        return f'{indent}{svg_html}'
    if tag == 'video':
        vsrc = node.get('vsrc', '')
        poster = node.get('poster', '')
        poster_attr = f' poster="{poster}"' if poster else ''
        html = f'{indent}<video autoplay muted loop playsinline{poster_attr}{attr_str}>'
        if vsrc:
            html += f'\n{indent}  <source src="{vsrc}" type="video/mp4">'
        return html + f'\n{indent}</video>'
    if tag in ('input', 'br', 'hr'):
        itype = node.get('type', 'text')
        placeholder = node.get('placeholder', '')
        extra = f' type="{itype}"' if tag == 'input' else ''
        extra += f' placeholder="{esc(placeholder)}"' if placeholder else ''
        return f'{indent}<{tag}{extra}{attr_str}>'
    if tag == 'textarea':
        return f'{indent}<textarea{attr_str}>{esc(node.get("t", ""))}</textarea>'
    if tag == 'iframe':
        return f'{indent}<iframe src="{esc(node.get("src", ""))}"  {attr_str}></iframe>'

    # ── Block tags ──
    extra = f' href="{esc(node["href"])}"' if tag == 'a' and node.get('href') else ''
    html = f'{indent}<{tag}{extra}{attr_str}>'
    text = node.get('t', '')
    kids = node.get('c', [])

    if text and not kids:
        return html + esc(text) + f'</{tag}>'
    if kids or text:
        html += '\n'
        if text and kids:
            html += f'{indent}  {esc(text)}\n'
        for child in kids:
            child_html = node_to_html(child, depth + 1, parent_styles=styles,
                                      collector=collector)
            if child_html:
                html += child_html + '\n'
        html += f'{indent}</{tag}>'
    else:
        html += f'</{tag}>'
    return html


def render_component(comp: dict, collector: StyleCollector = None) -> str:
    """Render a component with pixel-perfect CSS classes from extraction."""
    return node_to_html(comp, collector=collector)


# ═══════════════════════════════ PAGE GENERATION ═══════════════════════════

def generate_page(components: list, title: str = 'Home', css_path: str = 'assets/style.css',
                   responsive_data: dict = None) -> str:
    collector = StyleCollector(responsive_data=responsive_data)

    body_parts = []
    for comp in components:
        html = render_component(comp, collector=collector)
        if html:
            body_parts.append(html)

    body = '\n\n'.join(body_parts)
    element_css = collector.generate_css()
    comp_css = css_path.replace('style.css', 'components.css')

    # Minimal tab/accordion switching script
    tab_script = """
<script>
// Tab switching: click a button inside a tablist-like container to show/hide panes
document.querySelectorAll('[role="tablist"], [data-tabs]').forEach(tablist => {
  const tabs = tablist.querySelectorAll('[role="tab"], button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (!panel) return;
      // Hide all sibling panels
      panel.parentElement.querySelectorAll('[role="tabpanel"]').forEach(p => {
        p.style.display = 'none';
      });
      // Deactivate all tabs
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      // Show clicked panel, activate tab
      panel.style.display = '';
      tab.setAttribute('aria-selected', 'true');
    });
  });
});
</script>"""

    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <link rel="stylesheet" href="{css_path}">
  <link rel="stylesheet" href="{comp_css}">
  <style>
{element_css}
  </style>
</head>
<body>

{body}

{tab_script}
</body>
</html>"""


# ═══════════════════════════════ MAIN ═══════════════════════════

def main():
    if len(sys.argv) < 2:
        print("Usage: python helpers/generate-blueprint.py output/{domain}")
        sys.exit(1)

    site_dir = Path(sys.argv[1])
    extracted_dir = site_dir / 'extracted'
    blueprint_dir = site_dir / 'blueprint'
    blueprint_dir.mkdir(parents=True, exist_ok=True)
    (blueprint_dir / 'assets').mkdir(exist_ok=True)
    (blueprint_dir / 'pages').mkdir(exist_ok=True)

    # ── Load design tokens ───────────────────────────────────────
    ds_path = extracted_dir / 'design-system.json'
    tokens = DesignTokens.from_file(ds_path)
    if ds_path.exists():
        print(f"Loaded design tokens: {len(tokens.colors)} colors, {len(tokens.typography)} typography, {len(tokens.font_faces)} fonts")
    else:
        # Try alternative location
        alt_path = site_dir / 'design-system' / 'tokens.json'
        if alt_path.exists():
            tokens = DesignTokens.from_file(alt_path)
            print(f"Loaded design tokens from: {alt_path}")
        else:
            print("⚠ No design-system.json found — using empty tokens (output will lack precision)")

    # ── Generate CSS files from tokens ───────────────────────────
    style_css = tokens.generate_style_css()
    (blueprint_dir / 'assets' / 'style.css').write_text(style_css, encoding='utf-8')
    print(f"Generated: assets/style.css (font: {tokens.primary_font_family()}, color: {tokens.rgb_to_hex(tokens.primary_text_color())})")

    components_css = tokens.generate_components_css()
    (blueprint_dir / 'assets' / 'components.css').write_text(components_css, encoding='utf-8')
    print(f"Generated: assets/components.css ({len(tokens.colors)} colors, {len(tokens.typography)} typo classes, {len(tokens.buttons)} buttons)")

    # ── Process each page ────────────────────────────────────────
    page_files = sorted(extracted_dir.glob('page-*.json'))
    if not page_files:
        print(f"⚠ No page-*.json files found in {extracted_dir}")
        return

    for page_file in page_files:
        page_name = page_file.stem.replace('page-', '')
        data = load_json(page_file)

        if isinstance(data, list):
            components = data
        else:
            components = data.get('components', [])
            if not isinstance(components, list):
                components = [components]

        if page_name == 'home':
            html = generate_page(components, title=data.get('meta', {}).get('title', 'Home'))
            out = blueprint_dir / 'index.html'
        else:
            title = data.get('meta', {}).get('title', page_name.replace('-', ' ').title())
            html = generate_page(components, title=title, css_path='../assets/style.css')
            out = blueprint_dir / 'pages' / f'{page_name}.html'

        out.write_text(html, encoding='utf-8')
        comp_names = [c.get('componentName', '?') for c in components]
        print(f"Generated: {out.relative_to(site_dir)} — {len(components)} components: {', '.join(comp_names)}")

    print(f"\nDone. Blueprint at: {blueprint_dir}")


if __name__ == '__main__':
    main()
