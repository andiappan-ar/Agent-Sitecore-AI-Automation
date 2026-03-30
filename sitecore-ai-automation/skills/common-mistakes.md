# Common Mistakes & Fixes

Known gotchas learned from real projects. Apply these EVERY time.

## Sitecore Serialization

1. **Missing _PerSiteStandardValues in __Base template**
   - Symptom: Layout service returns empty `rendered: {}`
   - Fix: ALWAYS include `{44A022DB-56D3-419A-B43B-E27E4D8E9C41}` in __Base template
   - Every custom datasource template needs BOTH Standard + _PerSiteStandardValues

2. **Using GraphQL to create templates**
   - Symptom: `createItemTemplate` doesn't set `__Base template`
   - Fix: Always use YAML serialization + `dotnet sitecore ser push`

3. **Two-step multilist push**
   - Symptom: Multilist values fail validation on first push
   - Fix: Push with empty multilist values first, then restore GUIDs and push again

4. **Template field uses wrong GUID for Template:**
   - Template root: `ab86861a-6030-46c5-b394-e8f99e8b87db`
   - Field section: `e269fbb5-3750-427a-9149-7aa950b49301`
   - Field item: `455a3e98-a627-4b40-8035-e683a0331ac7`
   - Rendering: `04646a89-996f-4ee7-878a-ffdbf1f0ef0d`
   - Mixing these up produces silent failures

5. **Standard Values Template field wrong**
   - The `Template:` field of __Standard Values must be the SAME GUID as its parent template root
   - NOT the standard values template — it uses the component template itself

6. **Parent GUID chain broken**
   - Field section Parent must = template root ID
   - Field item Parent must = field section ID
   - Standard Values Parent must = template root ID
   - If any Parent is wrong, items appear in wrong location

## React / Next.js Components

7. **Missing 'use client' directive**
   - Symptom: Component map auto-generation skips this component
   - Fix: Add `'use client';` as the very first line

8. **Destructuring null fields**
   - Wrong: `const { title } = fields.data.datasource;`
   - Right: `const { data } = fields || {}; const { datasource } = data || {};`
   - Always use safe destructuring with `|| {}`

9. **Not guarding optional fields in edit mode**
   - Wrong: `<Text field={title} />`
   - Right: `{(title?.value || isEditing) && <Text field={title} />}`

10. **Raw strings instead of field components**
    - Wrong: `<h1>{title?.value}</h1>` — NOT editable in Experience Editor
    - Right: `<Text tag="h1" field={title} />` — editable

11. **Image field without spread pattern**
    - Wrong: `<ContentSdkImage field={fields.Image} />`
    - Right: `<ContentSdkImage field={{ ...fields.Image, value: { ...fields.Image.value, style: { width: '100%', height: 'auto' } } }} />`

## Docker / Environment

12. **IIS not stopped before starting Docker (LOCAL DOCKER)**
    - Symptom: Containers start but xmcloudcm.localhost is unreachable / times out
    - Fix: ALWAYS stop IIS first — it binds port 443/80 and blocks Traefik
    - Command: `Stop-Service W3SVC,WAS -Force -ErrorAction SilentlyContinue`
    - This must happen BEFORE `docker compose up -d`

13. **Creating .env.local with Docker rendering host**
    - Symptom: ENOTFOUND errors
    - Fix: Never create `.env.local` — Docker uses its own env vars (`SITECORE_API_HOST: "http://cm"`)

14. **HNS port proxy not set (Windows 11)**
    - Symptom: xmcloudcm.localhost not accessible even after IIS stopped
    - Fix: Run port proxy: `netsh interface portproxy add v4tov4 listenport=443 listenaddress=127.0.0.1 connectport=443 connectaddress=$traefikIp`
    - Get Traefik IP: `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' traefik`

15. **Token expired**
    - Symptom: 401 errors on GraphQL
    - Fix: `dotnet sitecore cloud login` — tokens valid 24h only

## Component Map / Rendering Host

16. **Component not showing in Page Builder**
    - Symptom: Component added to page but renders blank or "Unknown component"
    - Fix: Component map key must EXACTLY match the Sitecore rendering's `Component Name` field
    - Run `npm run sitecore-tools:generate-map` after adding new components

17. **Using `export default` instead of named `Default` export**
    - Symptom: Component map generation ignores the component
    - Fix: Always use `export const Default: React.FC<Props> = ...` — never `export default`

18. **Import path `@/lib/component-props` vs `lib/component-props`**
    - Symptom: Module not found error
    - Fix: basic-nextjs uses `'lib/component-props'` (no `@` prefix). Kit starters use `'@/lib/component-props'`. Match the project.

19. **Missing `isPageEditing` prop in inner component**
    - Symptom: Fields invisible in editing mode when empty
    - Fix: Exported `Default` must call `useSitecore()` and pass `isPageEditing` to inner component

20. **Confusing flat fields vs datasource fields**
    - Our adnocgas components use flat: `fields.Heading` (TextField)
    - Kit starters use datasource: `fields.data.datasource.heading.jsonValue`
    - They are NOT interchangeable — depends on component query config
    - Check existing components in the same rendering host before writing new ones

21. **Not running `npm run sitecore-tools:generate-map` after adding components**
    - Symptom: New component works in dev but not after build/deploy
    - Fix: Always regenerate map — it creates both `.sitecore/component-map.ts` and `component-map.client.ts`

22. **`linktype="internal"` in General Link fields crashes layout service**
    - Symptom: Layout service returns 500 when datasource has `<link linktype="internal" url="/path" />`
    - Root cause: `linktype="internal"` requires a Sitecore item GUID (`id="{...}"`), not a URL path
    - Fix: Use `linktype="external"` with `url="/path"` for path-based links, or provide the actual item ID for internal links
    - CBRE reference: Their content items have empty link fields — populated via Page Builder UI, not YAML

23. **Image field with empty `mediaid=""` crashes layout service**
    - Symptom: 500 when datasource has `<image mediaid="" src="https://..." />`
    - Fix: Either provide a valid media library item GUID or leave the field completely empty (no XML at all)

24. **Rendering YAML missing Datasource Template/Location fields**
    - Symptom: Datasource can't be assigned, layout service can't resolve datasource fields
    - Fix: Add `Datasource Template` (path to template) and `Datasource Location` (query for data folder) to rendering SharedFields
    - See CBRE CBREHeader.yml for reference pattern

25. **Portproxy stale after Docker restart (Windows 11)**
    - Symptom: `curl https://xmcloudcm.localhost` times out but `curl https://<traefik-ip>` works
    - Fix: Delete and re-add portproxy, or update hosts file to point directly to Traefik IP
    - Get new Traefik IP: `docker inspect xmcloud-starter-js-traefik-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`
