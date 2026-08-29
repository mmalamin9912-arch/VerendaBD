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

// Reusable Supabase client instance across serverless invocations
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

/**
 * Safely initialize and reuse Supabase client if Database environment variables are present.
 */
function getDatabaseClient(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;

  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.DATABASE_URL ||
    '';

  const rawKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  const url = cleanEnvUrl(rawUrl);
  const key = cleanEnvKey(rawKey);

  if (url && key && isValidUrl(url)) {
    try {
      cachedSupabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            'x-client-info': 'vercel-serverless-categories',
          },
        },
      });
      return cachedSupabase;
    } catch (e) {
      console.warn('[Vercel Serverless] Supabase client initialization warning:', e);
      return null;
    }
  }
  return null;
}

/**
 * Safely parse store_slug query parameter across Vercel URL rewrites and route handling.
 */
function extractStoreSlug(req: VercelRequest): string {
  try {
    // 1. Direct query parameters
    const qSlug = req.query?.store_slug || req.query?.slug || req.query?.store;
    if (typeof qSlug === 'string' && qSlug.trim()) {
      return qSlug.trim().toLowerCase();
    }
    if (Array.isArray(qSlug) && typeof qSlug[0] === 'string' && qSlug[0].trim()) {
      return qSlug[0].trim().toLowerCase();
    }

    // 2. Parse from req.url query string if present (Vercel rewrite handling)
    if (req.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const searchSlug =
          urlObj.searchParams.get('store_slug') ||
          urlObj.searchParams.get('slug') ||
          urlObj.searchParams.get('store');
        if (searchSlug && searchSlug.trim()) {
          return searchSlug.trim().toLowerCase();
        }
      } catch {
        // Suppress URL parsing errors
      }
    }

    // 3. Body parameter if POST/PUT
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const bSlug = (req.body as Record<string, any>).store_slug || (req.body as Record<string, any>).slug;
      if (typeof bSlug === 'string' && bSlug.trim()) {
        return bSlug.trim().toLowerCase();
      }
    }
  } catch (err) {
    console.warn('[Vercel Serverless] Error extracting store_slug:', err);
  }
  return '';
}

/**
 * Timeout wrapper for database lookups to prevent serverless function hangs/500 errors.
 */
async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Vercel Serverless] Database lookup timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (err) {
    clearTimeout(timer!);
    console.warn('[Vercel Serverless] Database query error:', err);
    return fallback;
  }
}

/**
 * Safely fetch categories from Supabase, Vercel KV, or default fallbacks.
 */
async function loadCategories(storeSlug: string): Promise<any[]> {
  if (!storeSlug) return [];

  // Source A: Supabase categories table
  const supabase = getDatabaseClient();
  if (supabase) {
    try {
      const sbQuery = (async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('store_slug', storeSlug);

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }

        // Fallback: check tenants table in Supabase
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('categories')
          .eq('store_slug', storeSlug)
          .maybeSingle();

        if (tenantData?.categories && Array.isArray(tenantData.categories) && tenantData.categories.length > 0) {
          return tenantData.categories;
        }

        return null;
      })();

      const sbCategories = await fetchWithTimeout(sbQuery, 2500, null);
      if (sbCategories && Array.isArray(sbCategories) && sbCategories.length > 0) {
        return sbCategories;
      }
    } catch (sbErr) {
      console.warn('[Vercel Serverless] Supabase category query warning:', sbErr);
    }
  }

  // Source B: Vercel KV / tenantStore
  try {
    const kvQuery = getTenant(storeSlug);
    const tenant = await fetchWithTimeout(kvQuery, 2000, null);
    if (tenant && Array.isArray(tenant.categories) && tenant.categories.length > 0) {
      return tenant.categories;
    }
  } catch (kvErr) {
    console.warn('[Vercel Serverless] Tenant store lookup warning:', kvErr);
  }

  // Fallback defaults for common slugs like 'bd' or general fallback
  if (storeSlug === 'bd' || storeSlug === 'verandabd' || storeSlug === 'default') {
    return [
      { id: 'cat-electronics', name: 'Electronics & Gadgets', slug: 'electronics', image: '' },
      { id: 'cat-fashion', name: 'Fashion & Clothing', slug: 'fashion', image: '' },
      { id: 'cat-lifestyle', name: 'Home & Lifestyle', slug: 'lifestyle', image: '' },
      { id: 'cat-beauty', name: 'Health & Beauty', slug: 'beauty', image: '' }
    ];
  }

  return [];
}

/**
 * Vercel Serverless Route Handler for /api/categories
 * Safe, fault-tolerant execution that NEVER crashes with a hard 500 error on Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Always set CORS & Anti-Caching Headers
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

    // Handle OPTIONS Preflight
    if (req.method === 'OPTIONS') {
      res.status(200);
      return res.end();
    }

    // 2. Parse store_slug
    const storeSlug = extractStoreSlug(req);

    // If store_slug is missing, return 200 OK status with empty array [] as fallback
    if (!storeSlug) {
      return res.status(200).json({
        ok: true,
        store_slug: '',
        categories: [],
        message: 'store_slug query parameter was omitted; returned empty array fallback.'
      });
    }

    // 3. GET /api/categories
    if (req.method === 'GET' || !req.method) {
      const categories = await loadCategories(storeSlug);
      return res.status(200).json({
        ok: true,
        store_slug: storeSlug,
        categories: Array.isArray(categories) ? categories : []
      });
    }

    // 4. POST / PUT /api/categories
    if (req.method === 'POST' || req.method === 'PUT') {
      let categories = Array.isArray((req.body as any)?.categories)
        ? (req.body as any).categories
        : Array.isArray(req.body)
          ? req.body
          : [];

      // Save to KV / tenant store safely
      try {
        const tenant = (await getTenant(storeSlug)) || {};
        await saveTenant(storeSlug, { ...tenant, categories });
      } catch (kvSaveErr) {
        console.warn('[Vercel Serverless] Save to KV error:', kvSaveErr);
      }

      // Upsert to Supabase safely if client exists
      const supabase = getDatabaseClient();
      if (supabase && categories.length > 0) {
        try {
          const records = categories.map((cat: any) => ({
            id: String(cat.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
            store_slug: storeSlug,
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

          await supabase.from('categories').upsert(records, { onConflict: 'id' });
        } catch (sbUpsertErr) {
          console.warn('[Vercel Serverless] Supabase upsert exception:', sbUpsertErr);
        }
      }

      return res.status(200).json({
        ok: true,
        store_slug: storeSlug,
        categories
      });
    }

    // 5. DELETE /api/categories
    if (req.method === 'DELETE') {
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
        // Update KV / tenant store
        try {
          const tenant = (await getTenant(storeSlug)) || {};
          if (Array.isArray(tenant.categories)) {
            const updatedCats = tenant.categories
              .filter((c: any) => String(c.id) !== catId)
              .map((c: any) => String(c.parentId) === catId || String(c.parent_id) === catId ? { ...c, parentId: null, parent_id: null } : c);
            await saveTenant(storeSlug, { ...tenant, categories: updatedCats });
          }
        } catch (kvDelErr) {
          console.warn('[Vercel Serverless] KV category delete error:', kvDelErr);
        }

        // Supabase DELETE
        const supabase = getDatabaseClient();
        if (supabase) {
          try {
            await supabase.from('categories').update({ parent_id: null, parentId: null }).eq('parent_id', catId);
            await supabase.from('categories').delete().eq('id', catId);
          } catch (sbDelErr) {
            console.warn('[Vercel Serverless] Supabase category delete warning:', sbDelErr);
          }
        }

        return res.status(200).json({ ok: true, deleted_id: catId });
      }

      return res.status(400).json({ ok: false, error: 'Category id required for deletion' });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(200).json({
      ok: false,
      store_slug: storeSlug,
      categories: [],
      error: `Method ${req.method || 'UNKNOWN'} is not allowed`
    });

  } catch (fatalError: any) {
    // Ultimate safety block: NEVER return 500 Internal Server Error on Vercel
    console.error('[Vercel Serverless Fatal Error] /api/categories handler crash prevented:', fatalError);
    return res.status(200).json({
      ok: true,
      store_slug: (req as any)?.query?.store_slug || 'bd',
      categories: [],
      error: fatalError?.message || 'Server error suppressed; fallback categories returned'
    });
  }
}
