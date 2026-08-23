import { getTenant, publicTenant, saveTenant } from './tenantStore';

type Request = { method?: string; query: Record<string, string | string[] | undefined>; body?: Record<string, unknown> };
type Response = { status: (status: number) => Response; json: (body: unknown) => unknown; setHeader: (name: string, value: string) => void };
const reply = (res: Response, status: number, body: Record<string, unknown>) => res.status(status).json(body);

export default async function handler(req: Request, res: Response) {
  // Categories must be read fresh: a category can exist before any products are
  // assigned to it, so storefront data cannot be derived from product results.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  const storeSlug = typeof req.query.store_slug === 'string' ? req.query.store_slug.trim() : typeof req.body?.store_slug === 'string' ? req.body.store_slug.trim() : '';
  if (!storeSlug) return reply(res, 400, { ok: false, error: 'store_slug is required' });
  try {
    if (req.method === 'GET') return reply(res, 200, { ok: true, store_slug: storeSlug, storefront: publicTenant(await getTenant(storeSlug)) });
    if (req.method === 'POST') {
      const tenant = req.body?.tenant;
      const patch = req.body?.patch;
      if ((!tenant || typeof tenant !== 'object' || Array.isArray(tenant)) && (!patch || typeof patch !== 'object' || Array.isArray(patch))) {
        return reply(res, 400, { ok: false, error: 'tenant or patch must be an object' });
      }
      const next = tenant as Record<string, unknown> || { ...(await getTenant(storeSlug) || {}), ...(patch as Record<string, unknown>) };
      await saveTenant(storeSlug, next);
      return reply(res, 200, { ok: true, store_slug: storeSlug });
    }
    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { ok: false, error: `Method ${req.method || 'UNKNOWN'} is not allowed` });
  } catch {
    return reply(res, 500, { ok: false, error: 'Unable to load storefront data' });
  }
}
