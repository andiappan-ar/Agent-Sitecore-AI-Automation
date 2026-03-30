---
name: chrome-to-react
description: Build or fix a pixel-perfect React + Tailwind component by extracting design from a live website using Chrome MCP. Use when the user provides a live URL and wants to match an existing site's design — extracting layout measurements, colors, SVG icons, hover effects, and images directly from the browser DOM.
argument-hint: live URL or component name + URL
---

# Chrome → React Pixel-Perfect Skill

You are reverse-engineering a live website component into a production-quality React + TypeScript + Tailwind CSS component for a Sitecore XM Cloud project. Use Chrome MCP to extract exact design data directly from the browser.

---

## Step 1 — Navigate and Screenshot

Navigate to the live page and take a screenshot for visual reference:

```
mcp__chrome__chrome_navigate({ url: "https://www.cbre.ae/offices" })
mcp__chrome__chrome_screenshot()
```

Scroll to the target component if it's below the fold:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var el = document.querySelector('.target-class');
  if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  return el ? 'found' : 'not found';
})()`
})
mcp__chrome__chrome_screenshot()
```

---

## Step 2 — Identify the Component Structure

Inspect the DOM to understand the HTML hierarchy of the target component:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var el = document.querySelector('.target-class');
  if (!el) return 'not found';
  // Walk up to find the root container
  var ancestors = [];
  var node = el;
  while (node && ancestors.length < 6) {
    var r = node.getBoundingClientRect();
    ancestors.push({ tag: node.tagName, class: node.className.substring(0,80), width: r.width, left: r.left });
    node = node.parentElement;
  }
  return JSON.stringify(ancestors);
})()`
})
```

---

## Step 3 — Measure Exact Layout (Container + Columns)

Get pixel-perfect widths for every column and gap:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var container = document.querySelector('.outer-container-class');
  if (!container) return 'not found';
  var children = container.children;
  var result = { containerWidth: container.getBoundingClientRect().width, columns: [] };
  for (var i = 0; i < children.length; i++) {
    var r = children[i].getBoundingClientRect();
    result.columns.push({ class: children[i].className.substring(0,60), width: r.width, left: r.left });
  }
  // Calculate gap
  if (result.columns.length > 1) {
    result.gap = result.columns[1].left - result.columns[0].left - result.columns[0].width;
  }
  return JSON.stringify(result);
})()`
})
```

**Translate to Tailwind:**
- Container `1110px` → `max-w-[1110px] mx-auto`
- Column `552px` with flex → `flex-1` (inside constrained container)
- Column `278px` fixed → `w-[278px] shrink-0`
- Gap `64px` → `gap-16`

---

## Step 4 — Extract Colors, Typography, Spacing

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var targets = {
    heading: document.querySelector('.heading-class'),
    body: document.querySelector('.body-class'),
    link: document.querySelector('.link-class'),
    bg: document.querySelector('.section-class')
  };
  var result = {};
  for (var key in targets) {
    var el = targets[key];
    if (!el) continue;
    var s = window.getComputedStyle(el);
    result[key] = {
      color: s.color,
      fontSize: s.fontSize,
      fontFamily: s.fontFamily.substring(0,60),
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      backgroundColor: s.backgroundColor,
      padding: s.padding,
      transition: s.transition
    };
  }
  return JSON.stringify(result);
})()`
})
```

**Common CBRE color values:**
| Computed Value | Hex | Tailwind |
|---|---|---|
| `rgb(0, 63, 45)` | `#003f2d` | `text-[#003f2d]` — CBRE dark green |
| `rgb(67, 82, 84)` | `#435254` | `text-[#435254]` — CBRE dark gray |
| `rgb(202, 209, 211)` | `#cad1d3` | `border-[#cad1d3]` — CBRE border |
| `rgb(83, 129, 132)` | `#538184` | `text-[#538184]` — CBRE teal |

---

## Step 5 — Extract SVG Icons

Pull exact SVG paths directly from the live DOM — never use Lucide or other icon libraries as substitutes:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var svgs = document.querySelectorAll('.target-section svg');
  var result = [];
  svgs.forEach(function(svg, i) {
    result.push({
      index: i,
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'),
      height: svg.getAttribute('height'),
      innerHTML: svg.innerHTML.trim()
    });
  });
  return JSON.stringify(result);
})()`
})
```

Create React SVG components from the extracted data:

```tsx
// Use fill="currentColor" so the icon inherits text color (hover effects work automatically)
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <path d="[extracted path data]" />
  </svg>
);
```

---

## Step 6 — Check Hover Effects

Since `:hover` can't be triggered via JS events, inject CSS to force the hover state and screenshot it:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var style = document.createElement('style');
  style.id = 'hover-test';
  // Force hover state on target links
  style.textContent = '.target-link { text-decoration: underline !important; color: #003f2d !important; }';
  document.head.appendChild(style);
  return 'hover forced — screenshot now';
})()`
})
mcp__chrome__chrome_screenshot()
// Clean up after
mcp__chrome__chrome_execute_script({ script: `document.getElementById('hover-test').remove(); return 'cleaned';` })
```

Also check transition values to understand animation speed:

```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var link = document.querySelector('.target-link');
  if (!link) return 'not found';
  var s = window.getComputedStyle(link);
  return JSON.stringify({ transition: s.transition, cursor: s.cursor });
})()`
})
```

**Standard CBRE hover pattern for links:**
```tsx
// Color + underline with smooth transition
className="text-[#435254] hover:text-[#003f2d] no-underline transition-colors duration-200 group"
// Only underline the text span, not the icon:
// <span className="group-hover:underline">Link Text</span>
```

---

## Step 7 — Build the React Component

Follow the CBRE component pattern from `sitecore-xm-cloud-content-sdk` skill:

```tsx
'use client';

import type React from 'react';
import { type JSX } from 'react';
import {
  Text, RichText, Link,
  NextImage as ContentSdkImage,
  type TextField, type RichTextField, type LinkField, type ImageField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '@/lib/component-props';
import { NoDataFallback } from '@/utils/NoDataFallback';

interface MyComponentFields {
  title?: TextField;
  address?: RichTextField;
  ctaLink?: LinkField;
  image?: ImageField;
}

interface MyComponentProps extends ComponentProps {
  params: { [key: string]: any };  // eslint-disable-line
  fields: MyComponentFields;
  isPageEditing?: boolean;
}

const MyComponentDefault = (props: MyComponentProps): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) return <NoDataFallback componentName="MyComponent" />;

  const { title, address, ctaLink, image } = fields || {};
  const hasLink = ctaLink?.value?.href || isPageEditing;

  return (
    <div
      data-component="MyComponent"
      id={id ? id : undefined}
      className="max-w-[1440px] mx-auto px-14 py-6"
    >
      {/* Inner content constrained to match live site column width */}
      <div className="max-w-[1110px] mx-auto flex flex-row gap-16">
        {/* Col 1 */}
        <div className="flex-1 min-w-0">
          {(title?.value || isPageEditing) && (
            <Text tag="h3" field={title} className="text-[#435254] text-[32px] font-['Financier_Display',georgia,serif]" />
          )}
        </div>
        {/* Col 2 */}
        <div className="w-[278px] shrink-0">
          {(address?.value || isPageEditing) && (
            <RichText field={address} className="text-[#435254] text-[20px] leading-[32px] [&_p]:m-0" />
          )}
          {hasLink && (
            <Link field={ctaLink} className="inline-flex items-center gap-2 text-[#003f2d] text-[16px] font-semibold no-underline transition-colors duration-200 group mt-1">
              <span className="group-hover:underline">Get Directions</span>
            </Link>
          )}
        </div>
        {/* Col 3: Image */}
        {(image?.value?.src || isPageEditing) && (
          <div className="w-[152px] h-[152px] shrink-0 overflow-hidden">
            <ContentSdkImage
              field={{ ...image, value: { ...image?.value, width: 152, height: 152, style: { width: '152px', height: '152px', objectFit: 'cover' } } }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const Default: React.FC<MyComponentProps> = (props) => {
  const { page } = useSitecore();
  return <MyComponentDefault {...props} isPageEditing={page?.mode?.isEditing ?? false} />;
};
```

**Key rules:**
- Always `max-w-[1440px] mx-auto px-14` on outer container (matches CBRE page width)
- Use `max-w-[X]px mx-auto` on inner layout to constrain column group
- SVGs must use `fill="currentColor"` for hover color inheritance
- Use `group` + `group-hover:underline` on text spans — NOT `hover:underline` on `inline-flex` (it doesn't work)
- Editing mode guard: `(field?.value || isPageEditing) && <Text ... />`
- **Optional `LinkField` type guard:** `LinkField | undefined` cannot be passed directly to `<Link field={...}>` — always guard with `{field && <Link field={field} ... />}`. The same applies to any optional Sitecore field component that requires a non-nullable prop.

---

## Step 8 — Handle Images from CDN-Blocked Sources

If the live site images are on a CDN that blocks Python/curl (e.g. `mediaassets.cbre.com`):

### Option A: Figma MCP (if design source is Figma)
Images at `http://localhost:3845/assets/<hash>.png` — upload directly with Python.

### Option B: Chrome Download Bypass (for live site CDN images)

**Step 1** — While on the live page in Chrome, trigger downloads:
```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var images = [
    { url: 'https://mediaassets.cbre.com/.../image1.jpg', name: 'component-image-1' },
    { url: 'https://mediaassets.cbre.com/.../image2.jpg', name: 'component-image-2' },
  ];
  images.forEach(function(img, i) {
    setTimeout(function() {
      var a = document.createElement('a');
      a.href = img.url; a.download = img.name + '.jpg';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, i * 1500);
  });
  return 'Downloads triggered — wait for files in Downloads folder';
})()`
})
```

**Step 2** — Upload from `C:\Users\Andiappan Ravi\Downloads\` via Python (see `AUTHORING-GRAPHQL.md` for full script).

**Step 3** — Update datasource YAML with returned media GUIDs.

**CORS note:** Cannot POST from Chrome directly to Sitecore API. Always upload via Python from local filesystem.

---

## Step 9 — Verify Against Live Site

After pushing and reloading the local preview:

```
http://localhost:3000/api/editing/render?sc_itemid={PAGE-GUID}&sc_lang=en&sc_site={SITE}&sc_layoutKind=final&mode=preview&secret={SECRET}&route={/path}&tenant_id={TENANT-ID}&sc_version=1
```

**Measure actual rendered columns to confirm pixel accuracy:**
```js
mcp__chrome__chrome_execute_script({ script: `
(function() {
  var cards = document.querySelectorAll('[data-component="MyComponent"]');
  var result = [];
  cards.forEach(function(card) {
    var inner = card.firstElementChild;
    var cols = inner ? inner.children : [];
    var r = inner ? inner.getBoundingClientRect() : {};
    result.push({
      container: r.width,
      col1: cols[0] ? cols[0].getBoundingClientRect().width : 0,
      col2: cols[1] ? cols[1].getBoundingClientRect().width : 0,
      col3: cols[2] ? cols[2].getBoundingClientRect().width : 0
    });
  });
  return JSON.stringify(result);
})()`
})
```

Compare measured values against live site measurements from Step 3. Acceptable tolerance: ±3px (from gap rounding).

**Side-by-side comparison:**
1. Screenshot our rendered page
2. Navigate to live site, screenshot same section
3. Compare column positions, font sizes, colors, spacing visually

---

## Common Pitfalls

| Problem | Fix |
|---|---|
| `flex-1` expands too wide | Add `max-w-[Npx]` on the flex container — `flex-1` only constrains within its parent |
| `hover:underline` on `inline-flex` has no effect | Use `group` on the `<a>` + `group-hover:underline` on inner `<span>` |
| SVG icon color doesn't change on hover | Ensure SVG has `fill="currentColor"` not a hardcoded color |
| CDN images return 403 | Use Chrome download bypass (Step 8) |
| CSS hover rules can't be read (CORS) | Inject test styles via JS to force hover state visually |
| Border-t spans wrong width | Put `border-t` on outer full-width div, not on the constrained inner content div |
| `ContentSdkImage` SVG needs dimensions | Always pass `width` and `height` in the value spread for SVG files |
| `Type 'LinkField \| undefined' is not assignable` build error | Optional `LinkField` must be guarded: `{field && <Link field={field} />}` — never pass `LinkField \| undefined` directly to `<Link>` |

---

## Local Preview URL Reference

| Site | Page | sc_itemid |
|---|---|---|
| cbre-uae | Home | `18baed83-c60b-4a7d-b8e6-6d4a98703bb0` |
| cbre-uae | Offices | `8fd46b5b-0d39-41b9-add0-570df3c2c970` |

Editing secret: in `examples/kit-nextjs-product-listing/.env.local` → `SITECORE_EDITING_SECRET`

Tenant ID: visible in any existing preview URL used in the session.
