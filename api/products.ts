import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTenant, saveTenant } from './tenantStore';

type VercelRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  url?: string;
};

type VercelResponse = {
  status: (status: number) => VercelResponse;
  json: (body: unknown) => unknown;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

let cachedSupabase: SupabaseClient | null = null;

function cleanEnvUrl(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  return str.replace(/\/+$/, '');
}

function cleanEnvKey(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  return str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
}

function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDatabaseClient(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.DATABASE_URL || '';
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  const url = cleanEnvUrl(rawUrl);
  const key = cleanEnvKey(rawKey);

  if (url && key && isValidUrl(url)) {
    try {
      cachedSupabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-client-info': 'vercel-serverless-products' } },
      });
      return cachedSupabase;
    } catch (e) {
      console.warn('[Vercel Serverless] Supabase client init warning:', e);
      return null;
    }
  }
  return null;
}

function extractRawStoreSlug(req: VercelRequest): string {
  try {
    const qSlug = req.query?.store_slug || req.query?.slug || req.query?.store;
    if (typeof qSlug === 'string' && qSlug.trim()) return qSlug.trim();
    if (Array.isArray(qSlug) && typeof qSlug[0] === 'string' && qSlug[0].trim()) return qSlug[0].trim();

    if (req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const sSlug = urlObj.searchParams.get('store_slug') || urlObj.searchParams.get('slug') || urlObj.searchParams.get('store');
        if (sSlug && sSlug.trim()) return sSlug.trim();
      } catch {}
    }

    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const bSlug = (req.body as Record<string, any>).store_slug || (req.body as Record<string, any>).slug || (req.body as Record<string, any>).storeSlug;
      if (typeof bSlug === 'string' && bSlug.trim()) return bSlug.trim();
    }
  } catch (err) {
    console.warn('[Vercel Serverless] Error extracting store_slug:', err);
  }
  return 'bd';
}

async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch {
    clearTimeout(timer!);
    return fallback;
  }
}

async function loadProducts(cleanSlug: string): Promise<any[]> {
  if (!cleanSlug) cleanSlug = 'bd';
  const supabase = getDatabaseClient();
  if (supabase) {
    try {
      const sbQuery = (async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_slug', cleanSlug);

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('products')
          .eq('store_slug', cleanSlug)
          .maybeSingle();

        if (tenantData?.products && Array.isArray(tenantData.products) && tenantData.products.length > 0) {
          return tenantData.products;
        }
        return null;
      })();

      const sbProducts = await fetchWithTimeout(sbQuery, 2500, null);
      if (sbProducts && Array.isArray(sbProducts) && sbProducts.length > 0) {
        return sbProducts;
      }
    } catch (e) {
      console.warn('[Vercel Serverless] Supabase products load warning:', e);
    }
  }

  try {
    const tenant = await fetchWithTimeout(getTenant(cleanSlug), 2000, null);
    if (tenant && Array.isArray(tenant.products) && tenant.products.length > 0) {
      return tenant.products;
    }
  } catch {}

  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    if (req.method === 'OPTIONS') {
      res.status(200);
      return res.end();
    }

    const rawParam = extractRawStoreSlug(req);
    const cleanSlug = String(rawParam || 'bd').split(':')[0].trim().toLowerCase() || 'bd';

    if (req.method === 'GET' || !req.method) {
      try {
        const products = await loadProducts(cleanSlug);
        return res.status(200).json(Array.isArray(products) ? products : []);
      } catch (getErr: any) {
        console.error('[Vercel Serverless] GET /api/products error:', getErr);
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const product = (req.body && typeof req.body === 'object') ? (req.body as any) : {};
        if (!product.id) {
          product.id = `prod-${Date.now()}`;
        }

        // 1. Sanitize incoming payload fields & data types
        const rawSlug = String(product.store_slug || product.storeSlug || cleanSlug || 'bd');
        const store_slug = String(rawSlug).split(':')[0].trim().toLowerCase() || 'bd';

        const price = parseFloat(product.price ?? product.priceBDT ?? product.price_bdt ?? 0) || 0;
        const stock_quantity = parseInt(product.stock_quantity ?? product.stock ?? 0, 10) || 0;
        const stock = stock_quantity;

        const id = String(product.id).trim();
        const title = String(product.title || product.name || 'Untitled Product').trim();
        const image_url = String(product.image || product.image_url || '').trim();
        const category_id = String(product.categoryId || product.category_id || product.category || '').trim();
        const category = String(product.category || 'General').trim();
        const description = String(product.description || product.descriptionEn || '').trim();
        const sku = String(product.sku || '').trim();

        // Attach sanitized properties back to product object
        product.id = id;
        product.store_slug = store_slug;
        product.storeSlug = store_slug;
        product.price = price;
        product.priceBDT = price;
        product.stock_quantity = stock_quantity;
        product.stock = stock;
        product.status = product.status || 'active';
        product.is_published = product.is_published !== false;

        // Save to KV / tenantStore
        try {
          const tenant = (await getTenant(store_slug)) || {};
          const prods = Array.isArray(tenant.products) ? tenant.products : [];
          const idx = prods.findIndex((p: any) => String(p.id) === String(product.id));
          if (idx >= 0) prods[idx] = product;
          else prods.unshift(product);
          await saveTenant(store_slug, { ...tenant, products: prods });
        } catch (kvErr) {
          console.warn('[Vercel Serverless] Save product KV error:', kvErr);
        }

        // 2. Safe Supabase Queries
        const supabase = getDatabaseClient();
        if (supabase) {
          try {
            const sbRecord = {
              id: String(product.id),
              store_slug,
              title,
              name: title,
              price,
              stock_quantity,
              stock,
              image_url,
              image: image_url,
              category_id,
              category,
              status: 'active',
              is_published: true,
              sku,
              description,
            };

            const { error: upsertErr } = await supabase.from('products').upsert(sbRecord, { onConflict: 'id' });
            if (upsertErr) {
              console.warn('[Vercel Serverless] Primary product upsert failed, trying minimal:', upsertErr.message || upsertErr);
              const { error: minErr } = await supabase.from('products').upsert({
                id: sbRecord.id,
                store_slug: sbRecord.store_slug,
                title: sbRecord.title,
                price: sbRecord.price,
                image: sbRecord.image,
                status: 'active',
              }, { onConflict: 'id' });

              if (minErr) {
                console.error('[Vercel Serverless] Supabase product schema error on POST:', minErr);
                return res.status(400).json({
                  ok: false,
                  error: `Supabase schema or column error: ${minErr.message || upsertErr.message}`,
                  details: minErr || upsertErr,
                });
              }
            }
          } catch (sbErr: any) {
            console.error('[Vercel Serverless] Supabase product POST exception:', sbErr);
            return res.status(400).json({
              ok: false,
              error: `Supabase database error: ${sbErr?.message || 'Database execution failed'}`,
            });
          }
        }

        return res.status(200).json({ ok: true, success: true, product });
      } catch (postErr: any) {
        console.error('[Vercel Serverless] POST product error:', postErr);
        return res.status(400).json({ ok: false, error: postErr?.message || 'Invalid product payload' });
      }
    }

    if (req.method === 'DELETE') {
      let id = (typeof req.query?.id === 'string' ? req.query.id : '').trim();
      if (!id && req.body && typeof req.body === 'object') {
        id = String((req.body as any).id || (req.body as any).product_id || (req.body as any).category_id || '').trim();
      }
      if (!id && req.url) {
        try {
          const u = new URL(req.url, 'http://localhost');
          id = (u.searchParams.get('id') || u.searchParams.get('product_id') || u.searchParams.get('category_id') || '').trim();
        } catch {}
      }

      if (id) {
        try {
          const tenant = (await getTenant(cleanSlug)) || {};
          if (Array.isArray(tenant.products)) {
            const updated = tenant.products.filter((p: any) => String(p.id) !== id);
            await saveTenant(cleanSlug, { ...tenant, products: updated });
          }
        } catch {}

        const supabase = getDatabaseClient();
        if (supabase) {
          try {
            await supabase.from('products').delete().eq('id', id);
            await supabase.from('categories').delete().eq('id', id);
          } catch (e) {
            console.warn('[Vercel Serverless] Supabase delete warning:', e);
          }
        }

        return res.status(200).json({ ok: true, deleted_id: id });
      }

      return res.status(400).json({ ok: false, error: 'id required for deletion' });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(200).json({ ok: false, error: `Method ${req.method} not allowed` });

  } catch (err: any) {
    console.error('[Vercel Serverless Fatal Error] /api/products crash prevented:', err);
    return res.status(200).json([]);
  }
}
