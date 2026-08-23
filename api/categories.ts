import { getTenant, saveTenant } from './tenantStore';

type VercelRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown };
type VercelResponse = { status: (status: number) => VercelResponse; json: (body: unknown) => unknown; setHeader: (name: string, value: string) => void };

type Category = Record<string, unknown>;

const send = (res: VercelResponse, status: number, body: Record<string, unknown>) =>
  res.status(status).json(body);

/**
 * Vercel serverless route for one tenant's categories.
 * GET /api/categories?store_slug=my-store
 * POST /api/categories?store_slug=my-store  { categories: [...] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  const storeSlug = typeof req.query.store_slug === 'string' ? req.query.store_slug.trim() : '';
  if (!storeSlug) return send(res, 400, { ok: false, error: 'store_slug is required', categories: [] });

  if (req.method === 'GET') {
    const tenant = await getTenant(storeSlug);
    const categories = Array.isArray(tenant?.categories) ? tenant.categories : [];
    return send(res, 200, { ok: true, store_slug: storeSlug, categories });
  }

  if (req.method === 'POST') {
    const categories = (req.body as { categories?: unknown[] } | undefined)?.categories;
    if (!Array.isArray(categories)) return send(res, 400, { ok: false, error: 'categories must be an array', categories: [] });
    await saveTenant(storeSlug, { ...(await getTenant(storeSlug) || {}), categories: categories as Category[] });
    return send(res, 200, { ok: true, store_slug: storeSlug, categories });
  }

  res.setHeader('Allow', 'GET, POST');
  return send(res, 405, { ok: false, error: `Method ${req.method || 'UNKNOWN'} is not allowed` });
}
