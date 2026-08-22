import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(express.json());

const PORT = 3000;
const STORE_FILE = path.join(process.cwd(), 'local-store.json');

const defaultStorePayload = {
  merchant: null,
  products: [],
  themes: [],
  bankAccounts: [],
  mobileBanking: [],
  codConfig: null,
  couriers: [],
  orders: [],
  customers: [],
  adminPaymentConfig: null,
  pendingRequests: [],
  allMerchants: [],
};
const categoryStore = new Map<string, unknown[]>();
const merchantStore = new Map<string, Record<string, unknown>>();

const jsonError = (res: express.Response, status: number, error: string) => res.status(status).json({ ok: false, error });

async function readStorePayload() {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultStorePayload,
      ...parsed,
    };
  } catch (error) {
    await fs.writeFile(STORE_FILE, JSON.stringify(defaultStorePayload, null, 2));
    return defaultStorePayload;
  }
}

async function writeStorePayload(payload: any) {
  await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', provider: 'Zid local store' });
});

app.all('/api/categories', (req, res) => {
  const storeSlug = typeof req.query.store_slug === 'string' ? req.query.store_slug.trim() : '';
  if (!storeSlug) return jsonError(res, 400, 'store_slug is required');
  if (req.method === 'GET') return res.status(200).json({ ok: true, store_slug: storeSlug, categories: categoryStore.get(storeSlug) || [] });
  if (req.method === 'POST') {
    if (!Array.isArray(req.body?.categories)) return jsonError(res, 400, 'categories must be an array');
    categoryStore.set(storeSlug, req.body.categories);
    return res.status(200).json({ ok: true, store_slug: storeSlug, categories: req.body.categories });
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, `Method ${req.method} is not allowed`);
});

app.all('/api/merchants/update', (req, res) => {
  const storeSlug = typeof req.query.store_slug === 'string' ? req.query.store_slug.trim() : typeof req.body?.store_slug === 'string' ? req.body.store_slug.trim() : '';
  if (!storeSlug) return jsonError(res, 400, 'store_slug is required');
  if (req.method === 'GET') return res.status(200).json({ ok: true, store_slug: storeSlug, merchant: merchantStore.get(storeSlug) || null });
  if (req.method === 'POST') {
    if (!req.body?.merchant || typeof req.body.merchant !== 'object' || Array.isArray(req.body.merchant)) return jsonError(res, 400, 'merchant must be an object');
    merchantStore.set(storeSlug, req.body.merchant);
    return res.status(200).json({ ok: true, store_slug: storeSlug, merchant: req.body.merchant });
  }
  res.setHeader('Allow', 'GET, POST');
  return jsonError(res, 405, `Method ${req.method} is not allowed`);
});

app.get('/api/store', async (req, res) => {
  const payload = await readStorePayload();
  res.json(payload);
});

app.put('/api/store', async (req, res) => {
  const payload = req.body || defaultStorePayload;
  await writeStorePayload(payload);
  res.json({ status: 'ok', synced: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      // This server is started through tsx rather than `vite`; explicitly load
      // the project config so the React and Tailwind plugins are always active.
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
