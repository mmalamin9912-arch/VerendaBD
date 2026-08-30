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
  try {
    if (cachedSupabase) return cachedSupabase;

    const rawUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.DATABASE_URL ||
      '';

    const rawKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      '';

    const url = cleanEnvUrl(rawUrl);
    const key = cleanEnvKey(rawKey);

    if (!url || !key || !isValidUrl(url)) {
      return null;
    }

    cachedSupabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'x-client-info': 'vercel-serverless-categories',
        },
      },
    });
    return cachedSupabase;
  } catch (e: any) {
    console.warn('[Vercel Serverless] Supabase client initialization warning:', e?.message || e);
    return null;
  }
}

function extractRawStoreSlug(req: VercelRequest): string {
  try {
    const qSlug = req.query?.store_slug || req.query?.slug || req.query?.store;
    if (typeof qSlug === 'string' && qSlug.trim()) {
      return qSlug.trim();
    }
    if (Array.isArray(qSlug) && typeof qSlug[0] === 'string' && qSlug[0].trim()) {
      return qSlug[0].trim();
    }

    if (req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const searchSlug =
          urlObj.searchParams.get('store_slug') ||
          urlObj.searchParams.get('slug') ||
          urlObj.searchParams.get('store');
        if (searchSlug && searchSlug.trim()) {
          return searchSlug.trim();
        }

        const parts = urlObj.pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (lastPart && !lastPart.startsWith('categories') && !lastPart.startsWith('api')) {
          return lastPart.trim();
        }
      } catch {}
    }

    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const bSlug =
        (req.body as Record<string, any>).store_slug ||
        (req.body as Record<string, any>).slug ||
        (req.body as Record<string, any>).storeSlug;
      if (typeof bSlug === 'string' && bSlug.trim()) {
        return bSlug.trim();
      }
    }
  } catch (err: any) {
    console.warn('[Vercel Serverless] Error extracting store_slug:', err?.message || err);
  }
  return 'bd';
}

async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallback);
    }, timeoutMs);
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

const FALLBACK_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics & Gadgets', title: 'Electronics & Gadgets', slug: 'electronics', image: '', store_slug: 'bd' },
  { id: 'cat-fashion', name: 'Fashion & Clothing', title: 'Fashion & Clothing', slug: 'fashion', image: '', store_slug: 'bd' },
  { id: 'cat-lifestyle', name: 'Home & Lifestyle', title: 'Home & Lifestyle', slug: 'lifestyle', image: '', store_slug: 'bd' },
  { id: 'cat-beauty', name: 'Health & Beauty', title: 'Health & Beauty', slug: 'beauty', image: '', store_slug: 'bd' },
];

async function loadCategories(cleanSlug: string): Promise<any[]> {
  try {
    const sanitizedSlug = String(cleanSlug || 'bd').split(':')[0].trim().toLowerCase() || 'bd';

    // 1. Safe Supabase Queries
    const supabase = getDatabaseClient();
    if (supabase) {
      try {
        const sbQuery = (async () => {
          try {
            const { data, error } = await supabase
              .from('categories')
              .select('*')
              .eq('store_slug', sanitizedSlug);

            if (error) {
              console.error('[Vercel Serverless] Supabase categories error:', error.message);
              return null;
            }

            if (Array.isArray(data) && data.length > 0) {
              return data;
            }

            // Fallback to tenants table
            try {
              const { data: tenantData, error: tenantErr } = await supabase
                .from('tenants')
                .select('categories')
                .eq('store_slug', sanitizedSlug)
                .maybeSingle();

              if (tenantErr) {
                console.error('[Vercel Serverless] Supabase tenant categories error:', tenantErr.message);
              } else if (tenantData?.categories && Array.isArray(tenantData.categories) && tenantData.categories.length > 0) {
                return tenantData.categories;
              }
            } catch (tErr: any) {
              console.error('[Vercel Serverless] Supabase tenant lookup error:', tErr?.message || tErr);
            }

            return null;
          } catch (innerErr: any) {
            console.error('[Vercel Serverless] Supabase categories execution error:', innerErr?.message || innerErr);
            return null;
          }
        })();

        const sbCategories = await fetchWithTimeout(sbQuery, 2500, null);
        if (sbCategories && Array.isArray(sbCategories) && sbCategories.length > 0) {
          return sbCategories;
        }
      } catch (sbErr: any) {
        console.error('[Vercel Serverless] Supabase category query warning:', sbErr?.message || sbErr);
      }
    }

    // 2. Safe KV Query
    try {
      const kvQuery = getTenant(sanitizedSlug);
      const tenant = await fetchWithTimeout(kvQuery, 2000, null);
      if (tenant && Array.isArray(tenant.categories) && tenant.categories.length > 0) {
        return tenant.categories;
      }
    } catch (kvErr: any) {
      console.warn('[Vercel Serverless] Tenant store lookup warning:', kvErr?.message || kvErr);
    }

    // 3. Fallback categories
    if (sanitizedSlug === 'bd' || sanitizedSlug === 'verandabd' || sanitizedSlug === 'default') {
      return FALLBACK_CATEGORIES.map(c => ({ ...c, store_slug: sanitizedSlug }));
    }

    return [];
  } catch (err: any) {
    console.error('[Vercel Serverless] loadCategories exception:', err?.message || err);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.status(200);
      return res.end();
    }

    // Sanitize store_slug by splitting on ':'
    const rawParam = extractRawStoreSlug(req) || (typeof req.query?.store_slug === 'string' ? req.query.store_slug : '');
    const cleanSlug = String(rawParam || 'bd').split(':')[0].trim().toLowerCase() || 'bd';

    // GET handler
    if (req.method === 'GET' || !req.method) {
      try {
        const categories = await loadCategories(cleanSlug);
        return res.status(200).json(Array.isArray(categories) ? categories : []);
      } catch (getErr: any) {
        console.error('[Vercel Serverless] GET /api/categories error:', getErr?.message || getErr);
        return res.status(200).json([]);
      }
    }

    // POST/PUT handler
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        let categories = Array.isArray((req.body as any)?.categories)
          ? (req.body as any).categories
          : Array.isArray(req.body)
            ? req.body
            : req.body && typeof req.body === 'object'
              ? [req.body]
              : [];

        // Save to KV / tenantStore
        try {
          const tenant = (await getTenant(cleanSlug)) || {};
          await saveTenant(cleanSlug, { ...tenant, categories });
        } catch (kvSaveErr: any) {
          console.warn('[Vercel Serverless] Save to KV error:', kvSaveErr?.message || kvSaveErr);
        }

        // Safe Supabase upsert
        const supabase = getDatabaseClient();
        if (supabase && categories.length > 0) {
          try {
            const records = categories.map((cat: any) => ({
              id: String(cat.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
              store_slug: cleanSlug,
              title: String(cat.name || cat.title || 'Category'),
              name: String(cat.name || cat.title || 'Category'),
              image_url: String(cat.image || cat.coverImage || cat.image_url || ''),
              image: String(cat.image || cat.coverImage || cat.image_url || ''),
              category_id: String(cat.id || ''),
              status: cat.status || 'active',
              is_published: cat.status !== 'hidden',
              parent_id: cat.parentId || cat.parent_id || null,
              slug: cat.slug || '',
            }));

            const { error: upsertErr } = await supabase.from('categories').upsert(records, { onConflict: 'id' });
            if (upsertErr) {
              console.error('[Vercel Serverless] Supabase categories upsert error:', upsertErr.message);
            }
          } catch (sbUpsertErr: any) {
            console.error('[Vercel Serverless] Supabase categories upsert exception:', sbUpsertErr?.message || sbUpsertErr);
          }
        }

        return res.status(200).json(categories);
      } catch (postErr: any) {
        console.error('[Vercel Serverless] POST categories error:', postErr?.message || postErr);
        return res.status(200).json([]);
      }
    }

    // DELETE handler
    if (req.method === 'DELETE') {
      try {
        let catId = (typeof req.query?.id === 'string' ? req.query.id : '').trim();
        if (!catId && req.body && typeof req.body === 'object') {
          catId = String((req.body as any).id || (req.body as any).category_id || '').trim();
        }
        if (!catId && req.url) {
          try {
            const u = new URL(req.url, 'http://localhost');
            catId = (u.searchParams.get('id') || u.searchParams.get('category_id') || '').trim();
          } catch {}
        }

        if (catId) {
          try {
            const tenant = (await getTenant(cleanSlug)) || {};
            if (Array.isArray(tenant.categories)) {
              const updatedCats = tenant.categories
                .filter((c: any) => String(c.id) !== catId)
                .map((c: any) => String(c.parentId) === catId || String(c.parent_id) === catId ? { ...c, parentId: null, parent_id: null } : c);
              await saveTenant(cleanSlug, { ...tenant, categories: updatedCats });
            }
          } catch (kvDelErr: any) {
            console.warn('[Vercel Serverless] KV category delete error:', kvDelErr?.message || kvDelErr);
          }

          const supabase = getDatabaseClient();
          if (supabase) {
            try {
              await supabase.from('categories').update({ parent_id: null, parentId: null }).eq('parent_id', catId);
              const { error: delErr } = await supabase.from('categories').delete().eq('id', catId);
              if (delErr) {
                console.error('[Vercel Serverless] Supabase categories delete error:', delErr.message);
              }
            } catch (sbDelErr: any) {
              console.error('[Vercel Serverless] Supabase category delete warning:', sbDelErr?.message || sbDelErr);
            }
          }

          return res.status(200).json({ ok: true, deleted_id: catId });
        }

        return res.status(200).json({ ok: false, error: 'Category id required for deletion' });
      } catch (delErr: any) {
        console.error('[Vercel Serverless] Categories delete error:', delErr?.message || delErr);
        return res.status(200).json({ ok: false, error: delErr?.message || 'Delete operation failed' });
      }
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(200).json([]);
  } catch (fatalError: any) {
    console.error('[Vercel Serverless Fatal Error] /api/categories handler crash prevented:', fatalError?.message || fatalError);
    return res.status(200).json([]);
  }
}
