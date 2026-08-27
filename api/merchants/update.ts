type VercelRequest = { method?: string; query: Record<string, string | string[] | undefined>; body?: { store_slug?: unknown; merchant?: unknown } };
type VercelResponse = { status: (status: number) => VercelResponse; json: (body: unknown) => unknown; setHeader: (name: string, value: string) => void };

const merchantStore = new Map<string, Record<string, unknown>>();
const send = (res: VercelResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);

/** GET reads a tenant; POST upserts it. Every branch returns JSON. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const storeSlug = typeof req.query.store_slug === 'string'
    ? req.query.store_slug.trim()
    : typeof req.body?.store_slug === 'string' ? req.body.store_slug.trim() : '';
  if (!storeSlug) return send(res, 400, { ok: false, error: 'store_slug is required', merchant: null });

  if (req.method === 'GET') return send(res, 200, { ok: true, store_slug: storeSlug, merchant: merchantStore.get(storeSlug) || null });
  if (req.method === 'POST') {
    const merchant = req.body?.merchant;
    if (!merchant || typeof merchant !== 'object' || Array.isArray(merchant)) return send(res, 400, { ok: false, error: 'merchant must be an object', merchant: null });
    merchantStore.set(storeSlug, merchant as Record<string, any>);
    return send(res, 200, { ok: true, store_slug: storeSlug, merchant });
  }

  res.setHeader('Allow', 'GET, POST');
  return send(res, 405, { ok: false, error: `Method ${req.method || 'UNKNOWN'} is not allowed` });
}
