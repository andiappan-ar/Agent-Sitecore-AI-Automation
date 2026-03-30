# **Architectural Blueprint for Pixel-Perfect HTML to Figma Design Token Conversion**

The translation of ephemeral, browser-rendered Document Object Model (DOM) structures into static, editable vector topologies within Figma represents a profound architectural and mathematical challenge. Browsers rely on dynamic layout engines—such as Blink, WebKit, or Gecko—to continuously calculate element positioning, fluid constraints, and stylistic inheritance at runtime. Conversely, Figma utilizes a declarative, WebGL-based vector rendering engine driven by a strict nodal hierarchy and deterministic layout properties. Replicating a live web environment inside Figma in a pixel-perfect manner requires a highly coordinated pipeline that intercepts the browser's painting and layout phase, serializes the computed state into an intermediary Abstract Syntax Tree (AST), and strictly maps these mathematical properties to the Figma Plugin API.

Furthermore, extending this conversion beyond literal layout recreation into the extraction of systemic Design Tokens requires advanced algorithmic analysis. Identifying recurring typographic scales, spacing units, and color primitives from thousands of disparate DOM nodes demands spatial and mathematical clustering algorithms capable of reverse-engineering a site's foundational design system. The methodologies pioneered by leading tools such as html.to.design demonstrate that overcoming issues like box-sizing, stacking contexts, DOM serialization, shadow DOM piercing, proper rendering of fonts, optimal asset bundling, and iframe nesting is essential for high-fidelity conversion.1 This comprehensive report provides an exhaustive technical blueprint for constructing a pixel-perfect HTML-to-Figma conversion and design token generation pipeline, mirroring the sophisticated mechanics utilized by enterprise-grade engineering systems.

## **The Data Extraction Pipeline: Serializing the DOM**

The first stage of the conversion pipeline dictates that the live DOM must be traversed and serialized into a transportable JSON payload. Because the Figma Plugin API operates within a sandboxed QuickJS environment without direct access to the active browser tab's DOM, the extraction must be performed externally.2 This is universally achieved via a browser extension equipped with content scripts or DevTools debugging protocols, which can inject execution logic directly into the active viewport.2

### **Bounding Boxes and Sub-Pixel Geometry**

To achieve true pixel-perfection, structural DOM elements cannot merely be translated by their semantic HTML tags; they must be measured by their exact rendered geometry. The extraction algorithm must recursively invoke the getBoundingClientRect() method on every node within the document tree.4 This method returns a DOMRect object describing the element's width, height, and coordinates relative to the viewport, inclusive of padding and border-width.4

However, translating DOMRect values directly into Figma often yields compounding alignment discrepancies due to sub-pixel rendering. Browsers frequently utilize fractional pixels to resolve responsive percentages, flexible grid tracks, or viewport scaling.5 For instance, a box might return a computed width of 104.45px. When these fractional values are recursively nested across a complex DOM tree, they trigger the Moiré effect and compounding misalignment.6 Figma's rendering engine expects crisp, integer-based vectors, and importing fractional coordinates results in blurred edges and misaligned auto-layout gaps.7

To mitigate this discrepancy, the extraction script must standardize coordinates. While standard rounding logic can be applied at the serialization layer, high-fidelity extraction algorithms temporarily force hardware acceleration and integer-based pixel snapping during the extraction phase. This is achieved by injecting specific CSS directives onto the document root prior to measurement:

| CSS Injection Strategy | Target Element | Technical Justification |
| :---- | :---- | :---- |
| transform: translateZ(0) | html, body | Forces the browser's rendering engine to push the layer to the GPU, creating a composite layer that often resolves fractional pixel rounding anomalies.5 |
| will-change: transform | html, body | Signals to the browser that transformations will occur, optimizing the rendering pipeline for strict coordinate mapping.5 |
| \-webkit-font-smoothing: antialiased | body | Standardizes text rendering to match Figma's proprietary font smoothing algorithms, preventing text nodes from expanding beyond their expected bounding boxes.9 |

Furthermore, all geometric coordinates must be normalized against the window.devicePixelRatio. High-DPI displays (such as Retina screens) scale physical pixels against logical pixels. If the extraction script operates on a display with a pixel ratio of 2.0, the DOMRect values might be artificially inflated or deflated depending on the browser's zoom context.6 The algorithm must divide all spatial measurements by the devicePixelRatio to ensure that the resulting Figma coordinates remain at a standard 1x base resolution, which allows designers to export assets at @2x or @3x natively from the design file.8

## **Piercing DOM Encapsulation**

Modern web architecture heavily utilizes Web Components and custom elements that encapsulate their logic and styling within a Shadow DOM. Standard DOM traversal methods, such as iterating over element.childNodes, are blocked by the shadow boundary, leading to incomplete visual extraction and massive gaps in the resulting design file.12

### **Traversing the Shadow DOM**

To serialize a webpage accurately, the extraction algorithm must actively pierce the shadow boundary. The specification dictates that top-level elements of a shadow tree inherit inheritable styles from their host element, but the structure remains hidden from the main document query selectors.13 When traversing a node, the script must verify the presence of an element.shadowRoot property. If an open shadow root exists, the algorithm must recursively iterate through the shadowRoot.childNodes to capture the encapsulated geometry.14

Due to the emergence of Declarative Shadow DOM standards—which allow shadow roots to be defined in static HTML server-side via the \<template shadowrootmode="open"\> attribute—the serializer must also parse template contents and project the slotted architecture into the final AST to ensure no visual fidelity is lost during server-side rendered (SSR) site extraction.15 Nodes residing within the shadow tree are appended to the AST hierarchy identically to standard light DOM nodes, ensuring the Figma plugin receives a continuous, unbroken tree of visual elements.

### **Extracting CSSOM Pseudo-Elements**

Pseudo-elements, specifically ::before and ::after, pose a unique and highly complex architectural challenge. Because they are generated purely by the CSS rendering engine, they do not exist as standard HTML nodes within the DOM tree.16 They are frequently used for critical UI elements, including icons, decorative borders, tooltip carets, and clear-fix hacks.16 Because they lack a physical DOM representation, they cannot be targeted by getBoundingClientRect().

To extract pseudo-elements, the extraction script must interrogate the CSS Object Model (CSSOM) utilizing the native window.getComputedStyle() method, passing the pseudo-element string as the secondary parameter: window.getComputedStyle(element, '::before').18 If the returned content property is evaluated as anything other than "none" or an empty string, the serializer must construct a synthetic DOM node in the JSON payload.16

The coordinates for this synthetic node must be manually calculated. Because getComputedStyle returns layout values (such as top, left, width, and height) as strings (e.g., "20px"), the script must parse these strings into floats and compute their absolute position relative to the parent element's bounding box.16 This mathematical reconstruction guarantees that stylistic flourishes rendered purely in CSS are successfully translated into explicit Vector or Frame nodes within Figma.

## **Topological Mapping: CSS Layout to Figma Auto Layout**

Once the DOM is fully serialized into an intermediary JSON AST, the payload is transmitted to the Figma Plugin thread via parent.postMessage.21 The plugin must then recursively parse this tree, mapping dynamic CSS layout algorithms to Figma's proprietary, deterministic node structure.

The foundation of modern web layout is CSS Flexbox, which maps natively to Figma's "Auto Layout" feature.23 Both systems are designed around a one-dimensional flow (rows or columns) with dynamic distribution, alignment, and spacing properties.25 The plugin must map the computed CSS properties to the FrameNode properties as defined by the Figma Plugin API.27 The following mapping table illustrates the strict algorithmic translation required for pixel-perfect structural recreation:

| CSS Flexbox Property | Figma Plugin API Property | Translation Algorithm and Expected Value Constraints |
| :---- | :---- | :---- |
| display: flex | layoutMode | Triggers the conversion of a standard FrameNode into an Auto Layout frame. Establishes the node as a container for flex children.23 |
| flex-direction: row | layoutMode | Assigned as "HORIZONTAL". Forces child nodes to render along the x-axis.26 |
| flex-direction: column | layoutMode | Assigned as "VERTICAL". Forces child nodes to render along the y-axis.26 |
| justify-content | primaryAxisAlignItems | Dictates distribution along the main axis. Maps as follows: flex-start ![][image1] "MIN", center ![][image1] "CENTER", flex-end ![][image1] "MAX", space-between ![][image1] "SPACE\_BETWEEN".28 |
| align-items | crossAxisAlignItems | Dictates alignment along the cross axis. Maps as follows: flex-start ![][image1] "MIN", center ![][image1] "CENTER", flex-end ![][image1] "MAX", stretch ![][image1] "MAX" (with resizing constraints applied).28 |
| gap / row-gap / column-gap | itemSpacing | Direct pixel integer mapping. Defines the strict distance between sibling nodes within the Auto Layout flow. |
| flex-wrap: wrap | layoutWrap | Assigned as "WRAP". Pushes overflowing child nodes to the next line within the frame boundaries.26 |
| padding | paddingTop, paddingRight, etc. | Maps the computed padding box values to the individual directional padding properties of the Figma frame.26 |

When flex-wrap: wrap is detected, the container behaves as a multi-line auto layout flow. The translation algorithm must be careful to distinguish between align-items (which handles the cross-axis alignment of individual items on a single line) and align-content (which handles the cross-axis alignment of wrapped lines across the entire container), as Figma's API handles wrapped spacing through a separate counterAxisSpacing property.25

### **Absolute Positioning within Auto Layout Contexts**

A ubiquitous pattern in DOM architecture is placing an absolutely positioned element inside a relatively positioned flex container—for example, a notification badge overlapping a flex-aligned button, or a sticky header within a grid layout. Historically, applying Auto Layout to a Figma frame forced all children indiscriminately into the layout flow, destroying absolute positioning coordinates.29 However, the Figma API exposes the layoutPositioning property to replicate this exact CSS behavior.30

When the AST serializer detects position: absolute on a DOM node residing within a display: flex or display: grid parent, the plugin must set the corresponding Figma child node's layoutPositioning property to "ABSOLUTE".30 This setting extracts the node from the Auto Layout flow, allowing the plugin to explicitly define its x and y coordinates based on the relative offset captured from the DOM, perfectly mirroring the CSS absolute positioning paradigm.26 This property must be evaluated in tandem with Figma's constraints API (e.g., locking the node to the RIGHT and TOP) to ensure the design remains responsive when the user manually scales the frame in the Figma canvas.30

## **Reconciling the Z-Axis: The Stacking Context Algorithm**

Figma handles visual depth through a strict, one-dimensional array where the rendering is governed exclusively by the layer tree order—from the bottom of the array to the top.33 HTML and CSS, however, govern depth through a highly complex, three-dimensional conceptualization known as the Stacking Context.35 Translating a 3D stacking algorithm into a 1D layer array is one of the most mathematically intense components of the HTML-to-Figma conversion process.

### **Triggers and Boundaries of Stacking Contexts**

A naive conversion algorithm might assume that the CSS z-index property alone dictates the layer order. However, CSS dictates that z-index values are not globally scoped; they are strictly confined within their local stacking context.36 An element with z-index: 99999 will be rendered visibly beneath an element with z-index: 1 if the former is trapped inside a parent stacking context that sits below the latter in the document hierarchy.36

The DOM extraction script must identify every trigger that initializes a new stacking context. Beyond position paired with a non-auto z-index, contexts are spontaneously formed when an element possesses:

* An opacity value less than 1\.37  
* A transform, filter, perspective, or clip-path property not set to none.36  
* A will-change property targeting layout or paint variables.36  
* A mix-blend-mode other than normal.39  
* The explicit isolation: isolate property.36  
* A position: fixed or position: sticky declaration.36

### **The Layer Flattening Algorithm**

To achieve a pixel-perfect layer order in Figma, the AST must be transformed into a Stacking Context Tree. The conversion algorithm executes the following sequence:

1. **Context Construction**: Traverse the DOM. For every context trigger detected, create an isolated context node in the mathematical tree.39  
2. **Relative Sorting**: Within each isolated context node, sort the child elements according to the strict CSS painting order specification: background and borders first, followed by child elements with negative z-index values, block-level flow elements, floated elements, inline elements, and finally positive z-index values in ascending numerical order.39  
3. **Absolute Flattening**: Once the tree is sorted locally within every pocket of isolation, perform a post-order traversal to flatten the entire hierarchical structure into a single 1D array.  
4. **Figma Insertion**: The Figma plugin iterates over this flattened array, utilizing parent.appendChild(node).30 Because Figma pushes newly appended children to the absolute top of the layer stack, appending nodes in the exact sequence derived from the flattened 1D array guarantees that the visual Z-order perfectly matches the browser's complex stacking context rendering.34

This architectural approach solves the long-standing issue in design handoff where designers struggle to replicate the overlapping behaviors of dropdowns, sticky headers, and modal overlays.41

## **Translating Visual Paint and Effects**

Converting geometric bounds and layout hierarchies establishes the structural skeleton of the user interface, but visual styling dictates the fidelity. The CSSOM computed styles must be deeply parsed and mathematically translated into Figma's Paint, Effect, and Stroke arrays.

### **Mapping Box Shadows to Figma Effects**

CSS allows elements to possess multiple shadows defined within a single box-shadow declaration. This is parsed as a comma-separated list of values containing up to five parameters per shadow: offset-x, offset-y, blur-radius, spread-radius, and color.43 Figma accommodates this complexity by allowing arrays of Effect objects to be applied to a single node.44

The translation script extracts the CSS box-shadow values and maps them directly to Figma's API properties:

* The offset-x and offset-y values translate to the offset: { x, y } vector payload.  
* The blur-radius value translates directly to the radius property.  
* The spread-radius value translates to the spread property.  
* The CSS rgba string must be parsed into an object containing r, g, b (normalized to a 0-1 scale) and a (alpha/opacity).22

If the inset keyword is detected within the CSS shadow string, the plugin must configure the Figma effect type to "INNER\_SHADOW"; otherwise, it defaults to "DROP\_SHADOW".48

A critical API restriction must be observed regarding shadow spread. While the Figma Plugin API technically accepts a spread value on any geometry without throwing a compilation error, the canvas rendering engine will silently ignore spread calculations on vector networks or boolean operations that are not standard rectangles, ellipses, or frames, unless clipContent is enabled.48 The algorithm must dynamically assess the target geometry type before applying the spread scalar, potentially falling back to expanding the underlying vector path if a drop shadow spread is fundamentally required on a complex shape.

### **Affine Transformations for Linear Gradients**

Flat colors (background-color) translate trivially to Figma's SolidPaint object.49 However, CSS linear-gradient declarations present a severe mathematical hurdle. CSS defines gradients procedurally, often utilizing angles (e.g., 45deg) or directional keywords (to bottom right), along with percentage-based or pixel-based color stops.50

Figma requires linear gradients to be defined strictly as a "GRADIENT\_LINEAR" paint type, governed by a gradientTransform property, which expects a 2D affine transformation matrix 49:

![][image2]  
To map CSS background gradients accurately, the extraction logic must perform trigonometric calculations. The script parses the CSS angle ![][image3] and calculates the intersection points of the gradient line against the element's bounding box coordinates.51 The resulting start (![][image4]) and end (![][image5]) vectors must be normalized to a $$ coordinate space relative to the bounding box.

The transformation matrix is then calculated using the difference between these normalized points to establish the rotation and scale. If the gradient utilizes multiple color stops, they must be parsed into an array of ColorStop objects, each containing a normalized position (0 to 1\) and an RGB color value.49 Only by computing the trigonometric mapping of the gradient vector can the plugin recreate the precise angle and spread of the browser's native gradient engine.51

## **Media Handling: SVGs, Raster Graphics, and Binary Buffers**

HTML nodes representing media—such as \<img\> tags, \<svg\> elements, or CSS background images—require specialized processing. Browsers render these assets natively via HTTP streams, but Figma requires raw byte arrays or strict vector definitions to store media effectively within its internal document structure.52

### **Base64 Encoding and Uint8Array Processing**

For raster images, the DOM extraction script must fetch the asset directly from the source URL. To bypass Cross-Origin Resource Sharing (CORS) restrictions that frequently block the Figma Plugin's QuickJS environment from making arbitrary network requests, the Chrome Extension intercepts the image data at the browser level.53 The image is converted into a Blob and serialized as a Base64 encoded string within the JSON payload.53

Once the payload reaches the Figma Plugin, the Base64 string cannot be utilized directly. The Figma API dictates that figma.createImage() explicitly requires a Uint8Array containing the raw bytes of the file.54 The plugin must decode the Base64 string into a binary string using the atob() function, iterate through the string to read the individual character codes, and populate an instantiated Uint8Array buffer.56

| Buffer Conversion Process | Algorithmic Steps |
| :---- | :---- |
| **Decode Base64** | const binaryString \= window.atob(base64Payload).56 |
| **Allocate Memory** | const bytes \= new Uint8Array(binaryString.length).56 |
| **Populate Buffer** | Iterate i from 0 to length, assigning bytes\[i\] \= binaryString.charCodeAt(i).56 |
| **Instantiate Image** | const image \= figma.createImage(bytes) generates the secure internal image hash.54 |

The resulting image hash is then applied as an ImagePaint object to the fills array of a freshly instantiated RectangleNode that matches the exact geometric bounds of the original DOM element.55

### **Vector Nodes and SVG Parsing**

When the extraction script encounters an \<svg\> element, treating it as a rasterized image destroys its fundamental editability. Professional designers demand that SVGs remain as scalable, editable vector paths.52

The Chrome Extension captures the outerHTML of the \<svg\> node, leveraging DOM sanitization libraries (e.g., DOMPurify) to strip malicious scripts, injected event listeners, or unsupported attributes.57 Within the Figma Plugin, the SVG string is passed directly to figma.createNodeFromSvg(svgString).

However, mathematical discrepancies frequently occur between the vector path data (d attributes) extracted via the browser API and the way Figma natively computes vector nodes.58 The plugin must recursively parse the resulting VectorNode, ensuring that fillRule attributes map correctly. Distinguishing between nonzero and evenodd winding rules is critical to prevent complex icon paths with intersecting shapes from rendering incorrectly upon import.58

## **Typography and the Subpixel Rendering Dilemma**

Text rendering is universally acknowledged as the most common point of failure for pixel-perfect design conversions. Discrepancies arise because browsers utilize operating-system-level text rasterizers—such as DirectWrite on Windows, CoreText on macOS, or FreeType on Linux—while Figma utilizes its own proprietary, OS-agnostic WebGL text rendering engine.10

### **Anti-Aliasing and Font Weight Adjustments**

A ubiquitous issue is that text rendering in a web browser often appears slightly heavier or thinner than the exact same font file rendered within the Figma canvas.10 Browsers apply varied sub-pixel anti-aliasing techniques based on user preferences and screen DPI. If a web project uses CSS directives like \-webkit-font-smoothing: antialiased or \-moz-osx-font-smoothing: grayscale, the browser forces a thinner, lighter rasterization by disabling subpixel rendering.9

Figma, by default, applies its own universal font smoothing algorithm that often makes text appear heavier, particularly when rendering light text on a dark background.10 While this discrepancy cannot be wholly corrected through mathematical offsets, the plugin must mitigate it by explicitly defining fontWeight attributes. The algorithm parses computed numerical weights (e.g., 400, 600\) rather than relying on qualitative strings ("normal", "bold"), minimizing the rendering delta across different typeface families.9

### **Bounding Box and Line Height Calculations**

A more critical geometric discrepancy involves the calculation of line-height. Browsers calculate the bounding box of a text node dynamically based on the font's internal ascender and descender metrics.61 If a browser computes a unitless CSS declaration of line-height: 1.5 on a 16px font, the rendering engine allocates precisely 24px of vertical space.61 Figma, however, frequently interprets native font metrics differently, causing text blocks to clip or shift vertically when mapped, which destroys the alignment of surrounding Auto Layout containers.62

To enforce pixel-perfect alignment, the plugin must abandon unitless layout values entirely. The extraction script captures the absolute computed pixel value of the line height from the CSSOM (e.g., 24.5px). The Figma plugin then overrides the TextNode parameters explicitly using the API:

JavaScript

node.lineHeight \= { value: 24.5, unit: 'PIXELS' };

By forcing absolute pixel definitions, the TextNode bounding box is forced to match the browser's DOMRect, ensuring that subsequent Auto Layout spacing, padding, and vertical rhythms align identically to the web implementation.65

### **Asynchronous Font Loading**

The Figma Plugin API prohibits synchronous modifications to text properties if the targeted font face is not loaded into the current environment memory. Before the plugin can apply the extracted CSS styles to a newly created TextNode, it must execute an asynchronous load command: await figma.loadFontAsync(fontName).65

Loading fonts sequentially for every node introduces massive performance bottlenecks. The optimized algorithm must traverse the entire JSON AST prior to any node generation, compiling a unique Set of all required font families and weights. The plugin then pre-loads all distinct fonts concurrently via Promise.all(). If a font is missing (e.g., an uninstalled local system font), the script must define a robust fallback mechanism, swapping the requested font for an available default metric-compatible font (like Inter or Roboto) while strictly maintaining the original dimensional geometry to prevent cascading layout collapse.66

## **Algorithmic Synthesis of Design Tokens**

While achieving pixel-perfect visual replication satisfies the basic requirement of an HTML-to-Figma tool, true enterprise utility requires abstracting those raw computed values into a reusable Design System.67 "Design Tokens" are platform-agnostic variables that represent core design decisions—colors, typography, spacing, and radii—allowing a single source of truth to propagate across engineering and design workflows.69 Extracting design tokens from a live, unstructured website requires advanced algorithmic clustering and taxonomic structuring.

### **Color Taxonomy and Hierarchical Clustering**

When parsing the DOM, an extraction script will capture hundreds of distinct hex codes and RGB strings from computed properties such as color, background-color, border-color, and box-shadow.72 Due to varied opacities, underlying gradients, and subtle CSS transitions, many of these extracted colors are mathematically distinct but visually identical (e.g., a pure \#FFFFFF background versus an rgba(255, 255, 255, 0.98) overlay). Exporting every distinct value would result in a bloated, unusable token library.

To generate a concise, systemic color token library, the system must utilize a hierarchical clustering algorithm.73 The raw hex codes are converted into a uniform, perceptually uniform color space—optimally CIELAB, which corresponds closely to human visual perception, or standard RGB vectors. The algorithm measures the mathematical distance between any two colors using the Euclidean distance formula 74:

![][image6]  
A similarity threshold is established (for instance, a perceptual delta of ![][image7]). The algorithm continuously evaluates the dataset, grouping the closest color nodes together, and merging clusters until no two distinct clusters possess a distance smaller than the predefined threshold.74 The median or most frequently occurring value of the largest resulting clusters becomes the foundational core color palette.

### **Structuring Semantic and Component Tokens**

Once the primitives are clustered, the extraction engine must structure them into a functional taxonomy. Enterprise design tokens operate on three distinct tiers, which the algorithm must reverse-engineer:

| Token Taxonomy Level | Definition and Algorithmic Inference Strategy | Example Syntax |
| :---- | :---- | :---- |
| **Primitive Tokens** | The absolute, foundational values, sequentially named based on luminance scales.75 | color-blue-500: \#0265DC 77 |
| **Semantic Tokens** | Values that communicate intent or context, referencing primitive tokens.77 Inferred by globally dominant application across the DOM. | color-primary, color-background-error 77 |
| **Component Tokens** | Values scoped directly to a specific UI element, referencing semantic tokens.79 Inferred by targeted application on specific DOM nodes (e.g., \<button\>). | button-primary-hover-bg 77 |

The extraction algorithm infers semantic intent by analyzing the DOM context metadata. If a clustered color is overwhelmingly found on \<button\> elements, it automatically receives a component-based nomenclature. If a color dictates the primary \<body\> background across multiple pages, it receives a foundational semantic taxonomy.78 Naming conventions are enforced algorithmically to ensure consistency, avoiding abbreviations and preferring explicit descriptions.79

### **Programmatic Generation of Figma Styles**

With the token structure formalized as a hierarchical JSON dictionary, the Figma plugin executes the final integration to establish the design system within the file. Utilizing the Figma API, the plugin iterates through the payload payload.

For every typography token, it executes figma.createTextStyle(), mapping the font family, font size, absolute line height, and tracking (letter-spacing).65 For color tokens, it executes figma.createPaintStyle(), populating the local styles panel with the exact hex conversions derived from the clustering algorithm.82 Effects, such as standardized drop shadows, are mapped via figma.createEffectStyle().82

This architectural pipeline allows subsequent exports to tools like Amazon's Style Dictionary or Tokens Studio.68 It establishes a fully automated continuous integration loop where a live, production website can be reverse-engineered into editable Figma styles, heavily modified by a design team, and immediately re-exported as standardized JSON, SCSS, or Swift variables for immediate engineering consumption across multiple platforms.68

## **Synthesis of the Extraction Architecture**

The pursuit of a pixel-perfect, algorithmic conversion from HTML to Figma transcends basic web scraping; it represents a highly sophisticated mathematical mapping between dynamic browser rendering engines and deterministic vector APIs. By successfully intercepting the CSSOM, piercing shadow roots, and correcting sub-pixel fractional values through forced hardware acceleration, the extraction phase generates a highly accurate AST immune to the Moiré effect.

The true engineering achievement lies in the translation phase—reconciling three-dimensional stacking contexts into one-dimensional layer arrays through post-order traversal flattening, computing 2D affine transform matrices for procedural linear gradients, and translating base64 encoded media into binary Uint8Array buffers. Furthermore, utilizing hierarchical agglomerative clustering to algorithmically synthesize a global design token architecture transforms a flat layout into a scalable, systemic foundation. By adhering strictly to the structural methodologies, spatial calculations, and API bindings outlined in this blueprint, engineering teams can successfully bridge the fundamental architectural gap between coded environments and design tooling, ensuring fidelity, continuous automation, and scalable design system integrity.

#### **Works cited**

1. code.to.design, the tech behind html.to.design, accessed March 23, 2026, [https://html.to.design/blog/the-tech-behind-html-to-design/](https://html.to.design/blog/the-tech-behind-html-to-design/)  
2. html.to.design \- Chrome Web Store, accessed March 23, 2026, [https://chromewebstore.google.com/detail/htmltodesign/ldnheaepmnmbjjjahokphckbpgciiaed](https://chromewebstore.google.com/detail/htmltodesign/ldnheaepmnmbjjjahokphckbpgciiaed)  
3. What is html.to.design?, accessed March 23, 2026, [https://html.to.design/docs/what-is-html-to-design/](https://html.to.design/docs/what-is-html-to-design/)  
4. Element: getBoundingClientRect() method \- Web APIs | MDN, accessed March 23, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)  
5. Addressing Sub-pixel Rendering and Pixel Alignment Issues in Web Development \- Medium, accessed March 23, 2026, [https://medium.com/design-bootcamp/addressing-sub-pixel-rendering-and-pixel-alignment-issues-in-web-development-cf4adb6ea6ac](https://medium.com/design-bootcamp/addressing-sub-pixel-rendering-and-pixel-alignment-issues-in-web-development-cf4adb6ea6ac)  
6. Pixel-perfect rendering with devicePixelContentBox | Articles \- web.dev, accessed March 23, 2026, [https://web.dev/articles/device-pixel-content-box](https://web.dev/articles/device-pixel-content-box)  
7. Best practices for positioning elements when converting Figma designs to HTML/CSS, accessed March 23, 2026, [https://community.latenode.com/t/best-practices-for-positioning-elements-when-converting-figma-designs-to-html-css/28985](https://community.latenode.com/t/best-practices-for-positioning-elements-when-converting-figma-designs-to-html-css/28985)  
8. How Mobile UI Designers Use Figma to Create Pixel-Perfect Interfaces \- Rosalie \- Medium, accessed March 23, 2026, [https://rosalie24.medium.com/how-mobile-ui-designers-use-figma-to-create-pixel-perfect-interfaces-72225f3ad1be](https://rosalie24.medium.com/how-mobile-ui-designers-use-figma-to-create-pixel-perfect-interfaces-72225f3ad1be)  
9. Discrepancy between Figma and web font appearance \- Latenode Official Community, accessed March 23, 2026, [https://community.latenode.com/t/discrepancy-between-figma-and-web-font-appearance/18750](https://community.latenode.com/t/discrepancy-between-figma-and-web-font-appearance/18750)  
10. Why your fonts look different in Figma vs. the browser — and how to fix it \- Medium, accessed March 23, 2026, [https://medium.com/@vi1etta/why-your-fonts-look-different-in-figma-vs-the-browser-and-how-to-fix-it-2ed1916daca8](https://medium.com/@vi1etta/why-your-fonts-look-different-in-figma-vs-the-browser-and-how-to-fix-it-2ed1916daca8)  
11. Pixel ratio stat? : r/FigmaDesign \- Reddit, accessed March 23, 2026, [https://www.reddit.com/r/FigmaDesign/comments/15tgcfd/pixel\_ratio\_stat/](https://www.reddit.com/r/FigmaDesign/comments/15tgcfd/pixel_ratio_stat/)  
12. Don't use jQuery plugins with Shadow DOM | by Rob Dodson | Dev Channel \- Medium, accessed March 23, 2026, [https://medium.com/dev-channel/dont-use-jquery-plugins-with-shadow-dom-e161f1891511](https://medium.com/dev-channel/dont-use-jquery-plugins-with-shadow-dom-e161f1891511)  
13. Styling: Styles Piercing Shadow DOM \- Open Web Components, accessed March 23, 2026, [https://open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/](https://open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/)  
14. How to serialize an HTML DOM including Shadow DOM? \- Stack Overflow, accessed March 23, 2026, [https://stackoverflow.com/questions/37016564/how-to-serialize-an-html-dom-including-shadow-dom](https://stackoverflow.com/questions/37016564/how-to-serialize-an-html-dom-including-shadow-dom)  
15. Declarative Shadow DOM | web.dev, accessed March 23, 2026, [https://web.dev/articles/declarative-shadow-dom](https://web.dev/articles/declarative-shadow-dom)  
16. javascript \- How to get pseudo element? \- Stack Overflow, accessed March 23, 2026, [https://stackoverflow.com/questions/38872290/how-to-get-pseudo-element](https://stackoverflow.com/questions/38872290/how-to-get-pseudo-element)  
17. Figma to HTML & CSS | Pseudo Elements & Flexbox \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=CBIRZiCPoYM](https://www.youtube.com/watch?v=CBIRZiCPoYM)  
18. Window: getComputedStyle() method \- Web APIs | MDN, accessed March 23, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)  
19. How to access before/after pseudo element styles with JavaScript \- makandra dev, accessed March 23, 2026, [https://makandracards.com/makandra/58174-access-pseudo-element-styles-javascript](https://makandracards.com/makandra/58174-access-pseudo-element-styles-javascript)  
20. getComputedStyle from the \`before\` pseudo element \- Stack Overflow, accessed March 23, 2026, [https://stackoverflow.com/questions/29016767/getcomputedstyle-from-the-before-pseudo-element](https://stackoverflow.com/questions/29016767/getcomputedstyle-from-the-before-pseudo-element)  
21. How to Dynamically Convert HTML to Figma Nodes Without Hardcoding?, accessed March 23, 2026, [https://forum.figma.com/ask-the-community-7/how-to-dynamically-convert-html-to-figma-nodes-without-hardcoding-21398](https://forum.figma.com/ask-the-community-7/how-to-dynamically-convert-html-to-figma-nodes-without-hardcoding-21398)  
22. How to develop your first Figma plugin for designers | by Lee Munroe \- Medium, accessed March 23, 2026, [https://leemunroe.medium.com/how-to-develop-your-first-figma-plugin-for-designers-7d01fe4ec894](https://leemunroe.medium.com/how-to-develop-your-first-figma-plugin-for-designers-7d01fe4ec894)  
23. 7 Auto Layout to Flexbox Mapping \- Oracle Help Center, accessed March 23, 2026, [https://docs.oracle.com/en/industries/financial-services/banking-digital-experience/25.1.1.0.0/txuxp/auto-layout-flexbox-mapping.html](https://docs.oracle.com/en/industries/financial-services/banking-digital-experience/25.1.1.0.0/txuxp/auto-layout-flexbox-mapping.html)  
24. MASTER Auto Layout in Figma\! The Complete Beginner to Pro Guide \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=nN0J7YrfZ10](https://www.youtube.com/watch?v=nN0J7YrfZ10)  
25. CSS for UI Designers: Understanding Flexbox and Applying it to Figma's Auto Layout, accessed March 23, 2026, [https://www.youtube.com/watch?v=Pi6MipIG5iI](https://www.youtube.com/watch?v=Pi6MipIG5iI)  
26. Guide to auto layout – Figma Learn \- Help Center, accessed March 23, 2026, [https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout)  
27. From Figma to Code: The DOM Starts in Figma, accessed March 23, 2026, [https://loosely-typed.me/posts/from-figma-to-code-the-dom-starts-in-figma](https://loosely-typed.me/posts/from-figma-to-code-the-dom-starts-in-figma)  
28. Integrating Flexbox Principles with Figma Auto Layout \- Ascend UX Blog | PROS, accessed March 23, 2026, [https://pros.com/ascend/integrating-flexbox-principles-with-figma-auto-layout/](https://pros.com/ascend/integrating-flexbox-principles-with-figma-auto-layout/)  
29. How to get calculated styles from Figma frames using plugin API, accessed March 23, 2026, [https://community.latenode.com/t/how-to-get-calculated-styles-from-figma-frames-using-plugin-api/33783](https://community.latenode.com/t/how-to-get-calculated-styles-from-figma-frames-using-plugin-api/33783)  
30. layoutPositioning | Developer Docs, accessed March 23, 2026, [https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning/](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning/)  
31.   
32. How to use absolute position in \#Figma \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=CyeIy0Cshec](https://www.youtube.com/watch?v=CyeIy0Cshec)  
33. Z-index management | Figma Forum, accessed March 23, 2026, [https://forum.figma.com/suggest-a-feature-11/z-index-management-30759](https://forum.figma.com/suggest-a-feature-11/z-index-management-30759)  
34. Layer order: Default is Stacking up from the bottom. Can this be changed to “top to bottom” like Adobe programs? : r/FigmaDesign \- Reddit, accessed March 23, 2026, [https://www.reddit.com/r/FigmaDesign/comments/1eb0445/layer\_order\_default\_is\_stacking\_up\_from\_the/](https://www.reddit.com/r/FigmaDesign/comments/1eb0445/layer_order_default_is_stacking_up_from_the/)  
35. Stacking context \- CSS \- MDN Web Docs, accessed March 23, 2026, [https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned\_layout/Stacking\_context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context)  
36. Notes from Josh Comeau's Article on Stacking Contexts \- Jim Nielsen's Blog, accessed March 23, 2026, [https://blog.jim-nielsen.com/2021/stacking-contexts/](https://blog.jim-nielsen.com/2021/stacking-contexts/)  
37. What The Heck, z-index?? Exploring stacking contexts, one of the most misunderstood mechanisms in CSS. \- Josh Comeau, accessed March 23, 2026, [https://www.joshwcomeau.com/css/stacking-contexts/](https://www.joshwcomeau.com/css/stacking-contexts/)  
38. Unstacking CSS Stacking Contexts \- Smashing Magazine, accessed March 23, 2026, [https://www.smashingmagazine.com/2026/01/unstacking-css-stacking-contexts/](https://www.smashingmagazine.com/2026/01/unstacking-css-stacking-contexts/)  
39. A Deep Dive into CSS Stacking Context \- Favour Adedapo, accessed March 23, 2026, [https://favourcodes.com/writings/css-stacking-context](https://favourcodes.com/writings/css-stacking-context)  
40. Z-index property that is independent from Auto Layout \- Figma Forum, accessed March 23, 2026, [https://forum.figma.com/suggest-a-feature-11/z-index-property-that-is-independent-from-auto-layout-23669/index2.html](https://forum.figma.com/suggest-a-feature-11/z-index-property-that-is-independent-from-auto-layout-23669/index2.html)  
41. Add Z-index for prototypes \- Figma Forum, accessed March 23, 2026, [https://forum.figma.com/suggest-a-feature-11/add-z-index-for-prototypes-42630](https://forum.figma.com/suggest-a-feature-11/add-z-index-for-prototypes-42630)  
42. Is there any way to change the "z-index" of an auto-layout child? \- Figma Forum, accessed March 23, 2026, [https://forum.figma.com/ask-the-community-7/is-there-any-way-to-change-the-z-index-of-an-auto-layout-child-24445](https://forum.figma.com/ask-the-community-7/is-there-any-way-to-change-the-z-index-of-an-auto-layout-child-24445)  
43. How do you code a box-shadow that creates this design? \- Stack Overflow, accessed March 23, 2026, [https://stackoverflow.com/questions/57192386/how-do-you-code-a-box-shadow-that-creates-this-design](https://stackoverflow.com/questions/57192386/how-do-you-code-a-box-shadow-that-creates-this-design)  
44. multiple box shadows \#231 \- tokens-studio figma-plugin \- GitHub, accessed March 23, 2026, [https://github.com/tokens-studio/figma-plugin/discussions/231](https://github.com/tokens-studio/figma-plugin/discussions/231)  
45. How to Create Smooth Drop Shadows in CSS and Figma | App Recommendation \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=t1w7W11opuk](https://www.youtube.com/watch?v=t1w7W11opuk)  
46. How To Add Shadow Effects In Figma (Easiest Way) (2026 Guide) \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=dD5LEJRtzhY](https://www.youtube.com/watch?v=dD5LEJRtzhY)  
47. Shadows in Figma \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=VFzPYmjANPk](https://www.youtube.com/watch?v=VFzPYmjANPk)  
48. Apply effects to layers – Figma Learn \- Help Center, accessed March 23, 2026, [https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers)  
49. Paint | Developer Docs, accessed March 23, 2026, [https://developers.figma.com/docs/plugins/api/Paint/](https://developers.figma.com/docs/plugins/api/Paint/)  
50. Figma Gradient | Grida, accessed March 23, 2026, [https://grida.co/docs/@designto-code/figma-gradient](https://grida.co/docs/@designto-code/figma-gradient)  
51. Demystifying Figma's Gradient Transformations: A Developer's Guide \- wp converters, accessed March 23, 2026, [https://wpconverters.com/demystifying-figmas-gradient-transformations-a-developers-guide](https://wpconverters.com/demystifying-figmas-gradient-transformations-a-developers-guide)  
52. How to Copy SVGs from Any Website Directly into Figma (2026) | MiroMiro, accessed March 23, 2026, [https://miromiro.app/blog/how-to-copy-svgs-from-any-website-to-figma](https://miromiro.app/blog/how-to-copy-svgs-from-any-website-to-figma)  
53. Working with Images | Developer Docs, accessed March 23, 2026, [https://developers.figma.com/docs/plugins/working-with-images/](https://developers.figma.com/docs/plugins/working-with-images/)  
54. createImage | Developer Docs \- Figma Developer, accessed March 23, 2026, [https://developers.figma.com/docs/plugins/api/properties/figma-createimage/](https://developers.figma.com/docs/plugins/api/properties/figma-createimage/)  
55. Image | Developer Docs, accessed March 23, 2026, [https://developers.figma.com/docs/plugins/api/Image/](https://developers.figma.com/docs/plugins/api/Image/)  
56. Convert base64 for use with rect.fills imageHash \- Figma Forum, accessed March 23, 2026, [https://forum.figma.com/ask-the-community-7/convert-base64-for-use-with-rect-fills-imagehash-19250](https://forum.figma.com/ask-the-community-7/convert-base64-for-use-with-rect-fills-imagehash-19250)  
57. Using Figma API to extract illustrations and icons | by Nicolas Declercq \- Medium, accessed March 23, 2026, [https://medium.com/iadvize-engineering/using-figma-api-to-extract-illustrations-and-icons-34e0c7c230fa](https://medium.com/iadvize-engineering/using-figma-api-to-extract-illustrations-and-icons-34e0c7c230fa)  
58. Exporting svg elements using Figma API issue, accessed March 23, 2026, [https://forum.figma.com/ask-the-community-7/exporting-svg-elements-using-figma-api-issue-11418](https://forum.figma.com/ask-the-community-7/exporting-svg-elements-using-figma-api-issue-11418)  
59. Do browsers render system fonts and webfonts differently? \- TypeDrawers, accessed March 23, 2026, [https://typedrawers.com/discussion/3457/do-browsers-render-system-fonts-and-webfonts-differently](https://typedrawers.com/discussion/3457/do-browsers-render-system-fonts-and-webfonts-differently)  
60. If I design in the Figma browser app, will fonts render the exact same way when my design is built? : r/FigmaDesign \- Reddit, accessed March 23, 2026, [https://www.reddit.com/r/FigmaDesign/comments/18tk75x/if\_i\_design\_in\_the\_figma\_browser\_app\_will\_fonts/](https://www.reddit.com/r/FigmaDesign/comments/18tk75x/if_i_design_in_the_figma_browser_app_will_fonts/)  
61. Bridging the Gap Between Figma Designs and Web Implementations | by Thamotharan NK PILLAI | Medium, accessed March 23, 2026, [https://medium.com/@thamunkpillai/bridging-the-gap-between-figma-designs-and-web-implementations-36bcf2f19bb5](https://medium.com/@thamunkpillai/bridging-the-gap-between-figma-designs-and-web-implementations-36bcf2f19bb5)  
62. Figma is rendering line-height incorrectly & it's messing up text alignment. Does anyone know how to fix this?, accessed March 23, 2026, [https://forum.figma.com/ask-the-community-7/figma-is-rendering-line-height-incorrectly-it-s-messing-up-text-alignment-does-anyone-know-how-to-fix-this-7697](https://forum.figma.com/ask-the-community-7/figma-is-rendering-line-height-incorrectly-it-s-messing-up-text-alignment-does-anyone-know-how-to-fix-this-7697)  
63. The difference of line-height rendering in different browsers : r/webdev \- Reddit, accessed March 23, 2026, [https://www.reddit.com/r/webdev/comments/1n2634b/the\_difference\_of\_lineheight\_rendering\_in/](https://www.reddit.com/r/webdev/comments/1n2634b/the_difference_of_lineheight_rendering_in/)  
64. Font size differnce between browser and Figma : r/FigmaDesign \- Reddit, accessed March 23, 2026, [https://www.reddit.com/r/FigmaDesign/comments/17v6yjw/font\_size\_differnce\_between\_browser\_and\_figma/](https://www.reddit.com/r/FigmaDesign/comments/17v6yjw/font_size_differnce_between_browser_and_figma/)  
65. Figma Plugin \- help programmatically creating text style \- Stack Overflow, accessed March 23, 2026, [https://stackoverflow.com/questions/66938453/figma-plugin-help-programmatically-creating-text-style](https://stackoverflow.com/questions/66938453/figma-plugin-help-programmatically-creating-text-style)  
66. Transform Web Pages into Figma Designs Instantly with HTML to Design Plugin \- YouTube, accessed March 23, 2026, [https://www.youtube.com/watch?v=2waVjHi9xtk](https://www.youtube.com/watch?v=2waVjHi9xtk)  
67. Design token automation from Figma to Storybook | Blog \- Matthew Rea, accessed March 23, 2026, [https://matthewrea.com/blog/design-token-automation-from-figma-to-storybook/](https://matthewrea.com/blog/design-token-automation-from-figma-to-storybook/)  
68. Creating a design tokens automation pipeline with Figma and Style Dictionary \- Medium, accessed March 23, 2026, [https://medium.com/@gabrielrudy575/creating-a-design-tokens-automation-pipeline-with-figma-and-style-dictionary-304272d5465f](https://medium.com/@gabrielrudy575/creating-a-design-tokens-automation-pipeline-with-figma-and-style-dictionary-304272d5465f)  
69. Color Design Tokens | Design Systems \- UXPin, accessed March 23, 2026, [https://www.uxpin.com/docs/design-systems/color-design-tokens/](https://www.uxpin.com/docs/design-systems/color-design-tokens/)  
70. Implementing Design Tokens: Typography \- Medium, accessed March 23, 2026, [https://medium.com/@slava.karablikov/implementing-design-tokens-typography-47091602abf8](https://medium.com/@slava.karablikov/implementing-design-tokens-typography-47091602abf8)  
71. Design Token-Based UI Architecture \- Martin Fowler, accessed March 23, 2026, [https://martinfowler.com/articles/design-token-based-ui-architecture.html](https://martinfowler.com/articles/design-token-based-ui-architecture.html)  
72. GitHub \- dembrandt/dembrandt: Extract any website's design system into tokens in seconds: logo, colors, typography, borders & more. One command., accessed March 23, 2026, [https://github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt)  
73. A SOM Clustering of block Colors \- Including HSL & RGB \- GitHub Gist, accessed March 23, 2026, [https://gist.github.com/0d2e658691a4f93cad92](https://gist.github.com/0d2e658691a4f93cad92)  
74. clusterfck \- JavaScript hierarchical clustering, accessed March 23, 2026, [https://harthur.github.io/clusterfck/](https://harthur.github.io/clusterfck/)  
75. Design tokens \- The Design System Guide, accessed March 23, 2026, [https://thedesignsystem.guide/design-tokens](https://thedesignsystem.guide/design-tokens)  
76. Design tokens \- Spectrum, Adobe's design system, accessed March 23, 2026, [https://spectrum.adobe.com/page/design-tokens/](https://spectrum.adobe.com/page/design-tokens/)  
77. Design tokens explained (and how to build a design token system) \- Contentful, accessed March 23, 2026, [https://www.contentful.com/blog/design-token-system/](https://www.contentful.com/blog/design-token-system/)  
78. Implementing Color Design Tokens: Practical Guide \- Medium, accessed March 23, 2026, [https://medium.com/@slava.karablikov/implementing-color-design-tokens-practical-guide-2ee1d46a1392](https://medium.com/@slava.karablikov/implementing-color-design-tokens-practical-guide-2ee1d46a1392)  
79. Naming design tokens: the art of clarity and consistency | by Zara Soltani | UX Collective, accessed March 23, 2026, [https://uxdesign.cc/naming-design-tokens-347f630ba4f9](https://uxdesign.cc/naming-design-tokens-347f630ba4f9)  
80. Naming colors in design systems \- Adobe Design, accessed March 23, 2026, [https://adobe.design/stories/design-for-scale/naming-colors-in-design-systems](https://adobe.design/stories/design-for-scale/naming-colors-in-design-systems)  
81. Create and apply text styles – Figma Learn \- Help Center, accessed March 23, 2026, [https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles](https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles)  
82. Create color, text, effect, and layout guide styles \- Figma Learn, accessed March 23, 2026, [https://help.figma.com/hc/en-us/articles/360038746534-Create-color-text-effect-and-layout-guide-styles](https://help.figma.com/hc/en-us/articles/360038746534-Create-color-text-effect-and-layout-guide-styles)  
83. How to Import JSON into Figma? \- The Design System Guide, accessed March 23, 2026, [https://thedesignsystem.guide/knowledge-base/how-to-import-json-into-figma](https://thedesignsystem.guide/knowledge-base/how-to-import-json-into-figma)  
84. Design Token Extractor \- Chrome Web Store, accessed March 23, 2026, [https://chromewebstore.google.com/detail/design-token-extractor/iibemocnockckccgcihcmjkciicfoclh](https://chromewebstore.google.com/detail/design-token-extractor/iibemocnockckccgcihcmjkciicfoclh)  
85. Introducing JSON Exporter/Importer: The Simplest Way to Export Figma Design Tokens | by Jackson Makinda | Feb, 2026 | Medium, accessed March 23, 2026, [https://medium.com/@makindajack/introducing-json-exporter-importer-the-simplest-way-to-export-figma-design-tokens-a8aa68a87d91](https://medium.com/@makindajack/introducing-json-exporter-importer-the-simplest-way-to-export-figma-design-tokens-a8aa68a87d91)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAUCAYAAABroNZJAAAAfklEQVR4XmNgGAWjAANwAHEaEPOgS5ACGIG4FYiN0SVIBSADeoGYBV2CFAByTQEQx0HZYCAAxJIkYjkgng/Ek4GYgRuIq4F4Fhl4BxB/ZaAAmADxaiCWQZcgFggD8WIglkeXIAVkAXEEuiApAJTYpgKxNLoEKQAUpbxQepABANsjErIyFZ/6AAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAvCAYAAABexpbOAAAFXUlEQVR4Xu3dT8hUVRzG8V9UUFjYn0WE/dNFEAQKUUIESbTIRSFJILURWitESBBiuBPDTSSKhKDQysCFunEhFxJdBBFhGURQIbpyEwVqRP0ezu94j6cZu3Pn3gbe9/uBhzlz5/qecVYP587cYwYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAi/SB51Dk3eo1zO4BS5/l557L1WsAAAC9qLBheI96vqkPAgAA9EFhGweFDQAADIbCNg4KGwAAGExd2A579nq2et7xfOJ52bPds83zxs0zh7fIuT/2nPHs8mzxnPNssvQ+9nsea0/thMIGAAAGUxe21zwbLX1xXp7zXIjxfZ4jMR7Doua+1/OI5zPP5jimz+VAjPU+Xo9xVxQ2AAAwmLqw3eM5FY+i19fE+FVLpUq02nW3Z72lwnMsxgfj9T66zv2+5w5Lq2J6POE5aanU9fWM52qM9Xcaz13xXCt9KnRSz/2SZ6fnbLyeUdgAAMBg6sKmYvRXjFd5fo6xCstFSyVtnee7OK5yo8uGTYy1EvVgvDarLnO/4vkxjn9vqTCJ5p2nsKmU/RRjldHrMVZJvOFZ7XnW/j33k5bKXn0LDwobAAAYTF3YPvRciXFZoDZ4rlm6PPi455c4rpKkv9HEWMVJZaWPLnO/4Pk1jus95EuV8xa2Lz1fxLgsb/ssldP3LM0/aW79/0/HOKOwAQCwxOlS26eep+K5vlullZ47LX0J//k4PoS6sKn05EuSWtFaWbym53oP91sqOKLz37RbC5te76PL3Pry/7dxTI/5s5i3sGlVUH9fyveRn8ukubXauMLzUBzPKGwAACxxWl3Sio6s9fxm7fepVCz6FqJJ6sLWlS4Fvuj5yFLB3OHZ7TlenjQSrbLpc1FRlD2e856jN88YTzm3St3fkUvlSUZhAwBgyXvL83SM9f0wFYLsYUsFaSh9C5vou2XaiinTWCth/4e+l12H0GVuChsAAMvIV9Z++X4aXY7Td6um5XbmKWyYjsIGAMAy8oe1X4YfA4VtHBQ2AACWCV36/NPaW1dMo/NUEKbldihs46CwAQCwTOg2Elpdyz84GAOFbRwUNgAAljj94OBra3+B+Lul8jYGCts4KGwAAGAwFLZxUNgAAMBg6sJ22LPXs9XSLUV013/drHe7Z5ulbZvGssi5tTfoGc8uzxbPOc8mS+9jv6Wb5s6CwgYAAAZTFzbtqLDRcyie61LshRjrjv9HYjyGRc2tzet1TzntKLE5julzORBjvY+8DVVXFDYAADCYurDp7v2n4lH0+poYawcGlSp529Iem/nfH/Os9xyM5310nVt7jua9TOWE56TNtzWVNnC/GmP9ncbaH3topU+FTuq59QvenZ6zxTGhsAEAgMHUha3cdH2VtTftVWG5aGkngyfimFa88r9vrN1LVNtn9THL3E08ZvPuJVpu+K5Lr9djrJJ4w7Pa2r1Gm3gUbdGlsne5OCYUNgAAMJi6sGkF6UqMywK1wXPN0uXBvPI0rbD9173fppll7iYes3kLmzazzzcoLsvbPksriXlvV2mKsegzOF0do7ABAIDB1IVNpSdfktSK1sriNT3Pq0wyrbD13Zx+lrmbYizzFjatCua/X76P/LzUFON1nhWWtgcrUdgAAMBg6sLWlYqKVsN+sLTp+w7Pbs/x8qSR6IcJ2rJLc6pY7fGc9xwtTxpJObf+3/leeZfKk4zCBgAABtS3sE2iAqOVMFDYAADAgFTY8p6jKlyYjy6r6rNca+0tSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABggn8AQNnwUnM/4y0AAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAXCAYAAAAyet74AAAA7ElEQVR4XuXRoYpCQRTG8bOgsOKCwgZd2GQQBJvYtNpMBgVfYTf7HhZBFkxisQqCxSaIZR/AoEUMNjUY3P2fOzM69z6B4Ac/HM89d2Y8ijxUXpBHDcnIs1sS6OEH31jgM9RB4uhjYNevmKDjN2ma2KNov+sVhpaug7xjiRFitvaGuaXrIC1c7afLBzbi7ag76E475O59UsYZXVfIYI0Ltp4j/tB2jSWcxHtTzCljHFBwxbqYI/QoF72r1qpeTSpixqI7a3ToUzGDdxMIondciXlBf90XZkj5TS4N/Iq5l/4b2fDjcHSo6WjxufMPwr0nO/SEKf8AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAYCAYAAABTPxXiAAADDklEQVR4Xu2XS6iNURTH/0KR95u8RVIYIK+UUyQGlEcIpUgkUSKRuCVJGYiiTDBQniGvknQwERIDE6UoKUMDE/L4/1vfvt/+9t3Xd75zvnszuP/6dc/Ze5/9WmuvtS7QoQ61i3qSCllE+iRtA8ggN6ANpPm1XoV0S9qGIV2/ZnUlB8kHspNsJy/JCfKUTEqHlqYe5Dx5RTaTA+QtaSJPyMDmkTWoCzlLLsMmdtINvSBVmIXKlOZ7SI7ALtBpPPkCO1wnrz1Xc8gnMjnsgN3OqbCxBK0l78iQoF0bv0S2Bu25Oko+kxFhB7WXLAsbG5Qsf508I72CPuk0mR425uki+UP2k85Bn8zbP2hrVHKlKvlF1qCl20wl3YO2XMm0OoTQxI9hD623P6hkNSFd8wfMMqtQx+ad9LCOwQ7gJhaKFDEXK0MKn/J9fz1xHw0GEbmSQulx8g02aeEHVlC6wNnkHMwiv8nCzIgcadPy+dAnpcWwCfeFHQ1K7jI6bEy0A3ZxS8OOf2kcLBIoWoRSdPhO1ocdDWoeLKnGpM3/hI2pWQqdd5Cmel8byHsyMvkus28iN8lycpicQctypG9Ca5JlY3lH3qDEV0X6JqaR22RJ8l3vSO6deTPKD7rtWX4jzMX0qFd6betglhtF3sAuQCWK778TyVdYzhnrtTu5/KDfjcl2YS7s0mYm3weTbbA9XIG5vtZ6AK+q0GlukD2wzKnPCqsnyUdk47cWn5B81kQqF3QrKkv8vKJIpsPrLcX8ejjst7tha1wgG2F5SnuY7wbCctNQWPnhXFrVgy6+WXpgunFJrjIDFqcriLuXk9whM1FEW5C6gC9tTAeRtEYFtqbW9usnJ41VVpcHaLxcPzZvTZLVVByqXL5HVsCspGo3rDRlNVW+MXcqKgWXu7DSRFZ+DjtQXZLbyN0OkVuwhymLLPAHJVJoVp6Jhe2iksteJbvINfII2Sq7sGRuN4H+xswvK6xGHf/MtKIpsOjYD1ZRlJ2z2lyKTq9hAUIRSxYp63LaTXJHHUC5Q1Gz7sLwv9ZftrZ9KUMZimkAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAYCAYAAACx4w6bAAACyklEQVR4Xu2Xy8tNURjGH6EIuX25RIkYuBQxocQAA7nklhTFyECRFJ8YICkTySURkcQAM7mE9JWJ8i9QSBShlIn783jXa+2zzj7Ht/fZlK/z1K+zz7vO3uv2Pu/aB2irrbb+pRaTH91kR7inKo0kT1HfTx73yQC7rZguki9kbhLvRWaS52RV0laVlsEGfyhtoIaTq+QybCyFNJQ8Js/ImNqm3zpHFqbBiqQJaWLL04YgTfx4GuyOppOP5DrpE2L6nEH6hu/Hwu+qltJLafaaTMjEJ5GOcK2JlbLBetiKdWZi2jntkue10nBIbK5Mmowm1UUGhphS7ijiQmqBRWFpAl/JCjKajCNnkJ/zVcuL10lY32IjbKKySGm5v76Rl+QFeRO+/y1PZeX+Up/qW2NQ36U8ldUs8gm1/hoEq0Se871DrGop9bpQ7689MHu41LfGUEjur6w5db6cIP3C93VkS2yuTO6v9Iw6TCaH6/Ewq/SPzX+WTHoB+eeXS6t6CdZB1VJ5b3R+uXbCFraQ3F86/bVLedoA2z0/HFWGtYJHyFJyjawMbS4dESPCZzO5v1RA8jSR3IWNTTumFD1LBof2BWReuK5Rnr9cSo3d5C2ZE2JjYRVLk9wHq2QHyE3EtJU0aQ14fyaWqpG/JPlpEXmC+Iw1ZDa5DRuP+ruBZFFU7V4hvodlK6L4nGm7g5jf2oVhiA9VKmmAfv64tpPvMO+kbXrGQ9T24RVRvM/EP5BpdtuvTNHE7sEyTYv8CPWL0pJ0eGtwzR6qtwalcKkX1wbSC4T7UZuj3avk+Utg/pK3HsDKsFZ0bfZHQUqXXWmwRelF3V/E5bdmRaeQNpHT5BQsJTaTvYhmdin9zpOpSbxVrSZXyDbyDo2LTin5Ydns0NYZND8NtiilnLJA/tKCyQqN/on8V9pKbsH+n8m72r0eoVGw4+cgmZK09Wz9BHPMl7qRUN/TAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAjCAYAAAApBFa1AAAGM0lEQVR4Xu3dW6htUxzH8b8Qcj9uuR+ScichRRSJwgOKcEq5Pngi1ImcknLLg0tHIpw6FMoLkcQqJVHiwSWXQuJJXlCOXMbPWOPMsf9zrDXnWnNOZ1m+n/q31/zvefaYl3Ua/z3GHGubAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFheO4TYEOJMgliSAABg6dwb4gyfBAAAwGLYKsQrPhls7xMLZtsQu7qcRgofD3Gdy3dRamcRlI7pyBAP+WRHpXa2lN0tvl9zF1u857u4PAAAvdkYYlOIv0J8N379dYgbs32GtofbPiDEWy73tsVjVHwT4vSV3+7NnlZvaxod+8nZdtr/tBDHZfl5bRPiBp9cII9ZLCjlthBfWTzmJzbv0c0JIfYev77D4j0Zyg8Wf76Kskl0rhuy7Z2sOtfvszwAAL27KMT1LqeC7VyXG4ofXfssxNEuJ3eHuNAnBzJLYfCO204Fi75O84BPFLzmEwvmMquf/4kWC61pVMw2nb/efx+5nIqqoei4f/HJAt3XdT4ZvO4TAAD0SVNYGhHKqfPqe2qrRJ3fVS6nAs5Ph2pb+UNdfghqa5bCQIVkXpypAG5z7R72iYIvfGLB6H586XLPuu0Svb+azv8pW3kddV9G2Xbf9EtLm4JN3nfbGmVd5XIAAPTmiBA/Wn006LwQz7hc37a2+PxPbt8QF7icnB3iT58ciNpSEdaWio+Txq/Vce9n8Tw0tTtNU8Ei/h5oSu7dEA+G+CDEPiu/3YtbrWrjc2tuQ8eo57p0bHdaPPdrV+xR16Zg+9bifonui6acNUWs4+rbxxYLtitCrLdqqrcknyq/L8RBIdZkOQAAeqUpxtL0n55H8kWLRhA0RaeOtBR6xmgSdeh+dEwjJm+4nDpoP9onOpbScQ5BbalgbSsvMjWFl55/23nzHmVNBYuej8rvga6hiqnVFp+z0iiP9umT2tCo3mqLbYysuQ29V7TP1Vadu0YZp2lTsGmUM3/PqJ1U4KtIbDquWalY0+KB9DovFr3R+Kvew+mc9QwoAACDGFkcWcjp+bGfrL8OUVNbl1r8mbk3Q+zlcuokSx2lOm9f3GkKa22Iw0M8beURkXssdsKlKBVlKhDU1o5ZTs9Sqa3nQnxisUDLafsml5skb1/P6uXbu2X7ia6/ipRE04O/j1+rqP1t/FrHpu3brb6AQ26x+rmnUJGVy6fH9TU9M3i5xfdJfjyJck2jcHK/Ve2+ZPXz9zSKla71/hYXw0gqVpVba3FlrqZh/f3X9fTnm8LfexWqOj8tOhEVYNrnZSuf88gnAAAYkjqmfMGBOi6NLvipSlGHeFaISybEKdWuRb9mr7cLcUi2nahg8p2p6DjzBQc6Pk3jagpSnaymyzS921VpJG+jVVPGH1q9YJt0zE2aRpj8asuRVUXrixZXs2o67pgQB1s8f12HLkZWFatqQ6OqakM0qlUqXnTN8gK3jTYjbFp1mVbaan+N4ooWxKhY1Xs1rdDVvl3uf14c6xeWu6z6+I7SOftn2AAAGIw6JI3YpBGVA608+tCXR0OcP359Tv6NjIovv2JVnWk+PaZRoZ+rb/+jzarMNkZWLTjQyI3a0krIpFSw6fm1eYqFpoJFtNAiecSqkZ0/LBZQ+liNJE1NdqE20s9QGyqqUxulgk3vIRW0s2pbsKUCVMehETn51OLUcKL7vn78dV76t2n6Wf8H8s9+8+cs+vgSAACWkhYZbApxrMWppknes+mfheWpwNTo37+xSq9UsGmqdB5NBYukIiXRNUwFVT6FerzFUa70mWVd6GekNvICsFSwnWqxgJpVm4JtncVRvlxp6vVmi8fc9f7r2paunz9nmfeeAwDwn6DO3Y+OeZr6fMEnJ5jlIf+u9CyYRiTzIkIjTPloT9+00vQon3T0PFi6Bk0rU+elglAjjyog80JRU7Sajh2KirE0Nenpeb10/zU9PMT9f9LiOetZyORKqz8vBwDAUrnG4ijbNOqgVRxN6qgXif7iwtB/Oul5G76NeahoaVoN2pXaKD1PuaUcFuJVnwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACA/7m/AWWHMHb3aEIfAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFIAAAAYCAYAAABp76qRAAADa0lEQVR4Xu2XS6hNURjHP0kREYoUeUYilBADA48ikTAQpmSgyOAq5JFMiPIopcgjI5K6eRTlxkRMPUoGklIKEwyUx/9311n3rr3uXvvsc8+hsH/173TW2o+1/utb3/q2WUVFxX9GH2mLtDjuqGiM6dIn6ak0IupLsVP6WVLLa/f8SQZIG6Sz0klpidQ3c0Wa8N4j0pRsdz5E43Hph7lJb812FzJI6pDeSROyXZ2DXiG9leZEfb+bIdJ1abM0UdovfZdu1/qKoP+udMjc/GZJz6W14UV5TJPapY3mzHwsDc9ckQbzMLHD3EtjaLsqTY07ekk/aWDcmMM26ZI0uPafYMEYAmWXvygB/U+koUEb3ryQRgZtGXw0bjIXznfMvYz/ZWDLcv3hoI3nsIo8GyPPW8EASoIhe6VH0oKoL4+L5sZF+vGwK75K9yy9GJiHidwfwr2fpVVRexeTzG0BH4HLzEUlA663BQADGXD4gtnmFgf6S2tqv71hlHRaum/OwLI5brX0TFoatDGuL5bePcDO+WA9jfT3hgHTBRFz0LLR53Me5qwP2vNgVVldXjzf3KQZyC1zW6EZxkvnzOW0GebG2iyMiXkdizsCvGEpI+P2ThjsNeuZD4mgMlHp8+M36U1NH80Z29ucyOlITkWlTsqSMI8H0ktpbNQXstKc2bFhhUbus/wTmpdiImZiagq2c5wfR5tLFT5RlzkciDaijugjClngVsLz26RXVn+Bfc6PDUsayWBvWrpmZFvzwA5L5xOfH8Macaa5dOHZYy7vFsEYyIEXzKWHVkPZ8lAaF7XnkTIs1d55xFMipAijMs+IovrRM0a6bMXpwRNGJYNt1bbGRJ45rPafcZMrU4efT1exYd7I3WEjE7xh9UsSDiEijpKIkibEvzBVSmAMdVvRYqXARHJ3swfNXOmKZReSrX3Cup9J6iFn8gs+QNitodl8FXEW8NsFkwsPiJTemzMyLyrz8qOHw+uU9Nqay3dh6TPPGjMUw8iJzCGcE4dhOGZOcOZxIGgjgLjWj90HRebwJQqp0Lm5EbWbi0oOJ28wCheET0E+w3wfJjQy+RQszFFzeW6Rlasl2ZrxHLzC0myHuTmQAjxE5xlzC0g9ionUpHxk/BOQQrZbcSXRKgiAydI6aaF1b/2KioqKioqKv4pfucvXZPLOc1oAAAAASUVORK5CYII=>