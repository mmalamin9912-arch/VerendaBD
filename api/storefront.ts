import { getTenant, publicTenant, saveTenant } from './tenantStore';

type Request = { method?: string; query: Record<string, string | string[] | undefined>; body?: Record<string, unknown>; url?: string };
type Response = { status: (status: number) => Response; json: (body: unknown) => unknown; setHeader: (name: string, value: string) => void };
const reply = (res: Response, status: number, body: Record<string, unknown> | unknown) => res.status(status).json(body);

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

  try {
    const rawSlug = typeof req.query?.store_slug === 'string'
      ? req.query.store_slug
      : typeof req.body?.store_slug === 'string'
        ? req.body.store_slug
        : typeof req.query?.slug === 'string'
          ? req.query.slug
          : 'bd';

    const cleanSlug = String(rawSlug || '').split(':')[0].trim().toLowerCase() || 'bd';

    if (req.method === 'GET' || !req.method) {
      const tenantData = await getTenant(cleanSlug);
      return reply(res, 200, { ok: true, store_slug: cleanSlug, storefront: publicTenant(tenantData) });
    }

    if (req.method === 'POST') {
      const tenant = req.body?.tenant;
      const patch = req.body?.patch;
      if ((!tenant || typeof tenant !== 'object' || Array.isArray(tenant)) && (!patch || typeof patch !== 'object' || Array.isArray(patch))) {
        return reply(res, 400, { ok: false, error: 'tenant or patch must be an object' });
      }
      const next = (tenant as Record<string, unknown>) || { ...(await getTenant(cleanSlug) || {}), ...(patch as Record<string, unknown>) };
      await saveTenant(cleanSlug, next);
      return reply(res, 200, { ok: true, store_slug: cleanSlug });
    }

    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { ok: false, error: `Method ${req.method || 'UNKNOWN'} is not allowed` });
  } catch (err: any) {
    console.error('[Vercel Serverless] /api/storefront error:', err);
    return reply(res, 200, { ok: true, store_slug: 'bd', storefront: {} });
  }
}
