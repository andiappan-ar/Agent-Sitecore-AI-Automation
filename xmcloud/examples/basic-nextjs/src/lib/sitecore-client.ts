import { SitecoreClient } from '@sitecore-content-sdk/nextjs/client';
import scConfig from 'sitecore.config';

/**
 * Custom REST layout service for local Docker development.
 * Edge GraphQL returns rendered:{} locally — REST API works fine.
 */
class RestLayoutService {
  async fetchLayoutData(
    path: string,
    options: { locale?: string; site?: string }
  ) {
    const { locale = 'en', site = 'adnocgas' } = options;
    const apiHost = process.env.NEXT_PUBLIC_SITECORE_API_HOST || process.env.SITECORE_API_HOST || '';
    const apiKey = process.env.NEXT_PUBLIC_SITECORE_API_KEY || process.env.SITECORE_API_KEY || '';
    const itemPath = (!path || path === '/') ? '/' : `/${path}`;

    const url = `${apiHost}/sitecore/api/layout/render/jss?item=${encodeURIComponent(itemPath)}&sc_apikey=${apiKey}&sc_site=${site}&sc_lang=${locale}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        return { sitecore: { context: { pageEditing: false, language: locale }, route: null } };
      }
      return await res.json();
    } catch (e) {
      console.error('[RestLayoutService]', e);
      return { sitecore: { context: { pageEditing: false, language: locale }, route: null } };
    }
  }
}

// Use REST layout service when running locally (no Edge context ID)
const useRest = !process.env.SITECORE_EDGE_CONTEXT_ID && !process.env.NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID;

const client = new SitecoreClient({
  ...scConfig,
  ...(useRest ? { custom: { layoutService: new RestLayoutService() } } : {}),
});

export default client;
