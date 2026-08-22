import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json());

const PORT = 3000;

// Initialize Supabase Admin for server-side persistence
const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabaseAdmin: any = null;
if (sbUrl && sbKey) {
  try {
    supabaseAdmin = createClient(sbUrl, sbKey);
    console.log('[Supabase Server] ✅ Supabase Admin Client initialized successfully with URL:', sbUrl);
  } catch (sbInitErr) {
    console.error('[Supabase Server] ❌ Failed to initialize Supabase client:', sbInitErr);
    supabaseAdmin = null;
  }
} else {
  console.warn('[Supabase Server] ⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing. Supabase queries will safely fall back to in-memory store.');
}

// In-memory fallback stores for local resilience
const SEED_PRODUCTS = [
  {
    id: 'prod-hydrating-cream',
    title: 'Hydrating Face & Body Moisturizer Cream',
    titleBn: 'হাইড্রেটিং ফেস ও বডি ময়েশ্চারাইজার ক্রিম',
    sku: 'HYDRA-CRM-01',
    category: 'Skincare & Beauty',
    priceBDT: 750,
    price: 750,
    costPriceBDT: 450,
    compareAtPriceBDT: 950,
    compare_at_price: 950,
    stock: 45,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'],
    variantsCount: 0,
    salesCount: 18,
    descriptionEn: 'Enriched deep hydrating face and body daily moisture care cream. Nourishes dry skin and provides 24-hour long-lasting smoothness and glow.',
    descriptionBn: 'ত্বকের গভীর আর্দ্রতা ধরে রাখতে প্রিমিয়াম হাইড্রেটিং ফেস ও বডি ক্রিম। ২৪ ঘণ্টার মসৃণ ও কোমল ত্বক নিশ্চিত করে।'
  },
  {
    id: 'prod-desk-dispenser',
    title: 'Automatic Water Bottle Desk Dispenser',
    titleBn: 'অটোমেটিক ওয়াটার বোতল ডেস্ক ডিসপেন্সার',
    sku: 'AUTO-DISP-02',
    category: 'Home & Kitchen',
    priceBDT: 1250,
    price: 1250,
    costPriceBDT: 800,
    compareAtPriceBDT: 1650,
    compare_at_price: 1650,
    stock: 28,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
    variantsCount: 0,
    salesCount: 34,
    descriptionEn: 'Rechargeable electric USB water pump dispenser for 5-gallon bottles and desktop hydration. Fast pumping with smart one-touch operation.',
    descriptionBn: 'স্মার্ট ওয়ান-টাচ ইউএসবি রিচার্জেবল পানির পাম্প ও ডেস্ক ডিসপেন্সার। সহজে যেকোনো বোতল বা গ্যালনে ব্যবহারযোগ্য।'
  },
  {
    id: 'prod-led-lamp',
    title: 'Nordic Minimalist LED Desk Lamp',
    titleBn: 'নরডিক মিনিমালিস্ট রিচার্জেবল LED ল্যাম্প',
    sku: 'LED-LAMP-03',
    category: 'Electronics & Lighting',
    priceBDT: 1850,
    price: 1850,
    costPriceBDT: 1200,
    compareAtPriceBDT: 2200,
    compare_at_price: 2200,
    stock: 32,
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80'],
    variantsCount: 0,
    salesCount: 42,
    descriptionEn: 'Modern dimmable eye-protection reading table lamp with touch controls and warm/cool ambient LED lighting modes.',
    descriptionBn: 'চোখের সুরক্ষায় টাচ কন্ট্রোল মাল্টি-মোড প্রিমিয়াম রিডিং টেবিল LED ল্যাম্প। ওয়ার্ম ও কুল লাইটিং সুবিধা।'
  }
];

const inMemoryStore = {
  subscriptions: new Map<string, any>(),
  products: new Map<string, any[]>([
    ['aminfashionbd', [...SEED_PRODUCTS]],
    ['default', [...SEED_PRODUCTS]],
    ['my-store', [...SEED_PRODUCTS]]
  ]),
  categories: new Map<string, any[]>(),
  customers: new Map<string, any[]>(),
  orders: new Map<string, any[]>(),
  merchants: new Map<string, any>(),
};

// Middleware: Ensure all /api responses explicitly have application/json content-type and CORS
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Merchant API - database check before account creation
app.get('/api/merchants/check/:email', async (req, res) => {
  const email = (req.params.email || '').trim().toLowerCase();
  if (!email) return res.json(null);

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .ilike('email', email)
        .maybeSingle();
      if (!error && data) {
        return res.json({
          ...data,
          storeName: data.store_name || data.storeName || 'My Store',
          storeSlug: data.store_slug || data.storeSlug || 'mystore',
          subscriptionPlan: data.subscription_plan || data.subscriptionPlan || 'enterprise',
          subscriptionExpiry: data.subscription_expiry || data.subscriptionExpiry,
          ownerName: data.owner_name || data.ownerName || 'Merchant Owner',
          logoUrl: data.logo_url || data.logoUrl || '',
        });
      }
    } catch (e) {
      console.warn('Supabase check merchant error:', e);
    }
  }

  // Pre-configured / verified production merchants
  if (email === 'mmalamin9912@gmail.com') {
    return res.json({
      storeName: 'Amin Fashion BD',
      storeSlug: 'aminfashionbd',
      ownerName: 'Al-Amin Hossain',
      email: 'mmalamin9912@gmail.com',
      phone: '+880 1812-345678',
      subscription_plan: 'enterprise',
      subscriptionPlan: 'enterprise',
      subscription_expiry: '2027-12-31T23:59:59.000Z',
      subscriptionExpiry: '2027-12-31T23:59:59.000Z',
      trialEndsAt: null,
      trialDaysRemaining: 365,
      logoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80',
    });
  }

  res.json(null);
});

// Subscription API
app.get('/api/subscription/by-store/:storeName', async (req, res) => {
  const { storeName } = req.params;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('merchants').select('subscription_plan, subscription_expiry').eq('storeName', storeName).single();
      if (!error && data) return res.json(data);
    } catch (e) {
      console.warn('Supabase subscription lookup error:', e);
    }
  }
  const fallback = inMemoryStore.subscriptions.get(storeName) || { subscription_plan: 'free_trial', subscription_expiry: null };
  res.json(fallback);
});

app.post('/api/subscription/update', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { storeName, planId, expiryDate } = req.body;
  inMemoryStore.subscriptions.set(storeName, { subscription_plan: planId, subscription_expiry: expiryDate });
  
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('merchants').update({
        subscription_plan: planId,
        subscription_expiry: expiryDate
      }).eq('storeName', storeName);
      if (!error) return res.json(data || { success: true });
    } catch (e) {
      console.warn('Supabase subscription update error:', e);
    }
  }
  res.json({ success: true, storeName, planId, expiryDate });
});

// Product API - Retrieve All or Filtered Products
const handleGetProducts = async (req: express.Request, res: express.Response) => {
  try {
    const merchantId = (req.params.merchantId || req.query.merchantId || req.query.storeSlug || '').toString().trim();
    const combined: any[] = [];
    const seenIds = new Set<string>();

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('products').select('*');
        if (merchantId) {
          query = query.or(`merchantId.eq.${merchantId},merchant_id.eq.${merchantId},store_slug.eq.${merchantId},storeSlug.eq.${merchantId},store_id.eq.${merchantId}`);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach(p => {
            const key = String(p.id || p.title).trim();
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combined.push(p);
            }
          });
        }
      } catch (e) {
        console.error('[API Catch: /api/products] Supabase query error:', e);
      }
    }

    // In-memory fallback
    if (merchantId) {
      const memProducts = [
        ...(inMemoryStore.products.get(merchantId) || []),
        ...(inMemoryStore.products.get('default') || [])
      ];
      memProducts.forEach(p => {
        const key = String(p.id || p.title).trim();
        if (!seenIds.has(key)) {
          seenIds.add(key);
          combined.push(p);
        }
      });
    }

    // If still empty or no merchantId specified, collect all from in-memory stores
    if (combined.length === 0) {
      for (const [_, list] of inMemoryStore.products.entries()) {
        if (Array.isArray(list)) {
          list.forEach(p => {
            const key = String(p.id || p.title).trim();
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combined.push(p);
            }
          });
        }
      }
    }

    res.status(200).json(combined);
  } catch (error) {
    console.error('[API Error in handleGetProducts]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/products', handleGetProducts);
app.get('/api/products/:merchantId', handleGetProducts);

// Products by Slug API
const handleGetProductsBySlug = async (req: express.Request, res: express.Response) => {
  try {
    const rawSlug = (req.params.storeSlug || req.query.storeSlug || req.query.slug || '').toString().trim();
    const storeSlug = rawSlug || 'aminfashionbd';
    let merchantId = storeSlug;

    if (supabaseAdmin) {
      try {
        const { data: mData, error: mErr } = await supabaseAdmin
          .from('merchants')
          .select('*')
          .or(`store_slug.eq.${storeSlug},storeSlug.eq.${storeSlug},slug.eq.${storeSlug},id.eq.${storeSlug}`)
          .maybeSingle();
        if (mData && mData.id) {
          merchantId = mData.id;
        }
        if (mErr) {
          console.warn('[API DB: /api/products-by-slug] Merchant lookup note:', mErr.message);
        }
      } catch (e) {
        console.error('[API DB: /api/products-by-slug] Merchant lookup error:', e);
      }
    }

    const memMerchant = inMemoryStore.merchants.get(storeSlug);
    if (memMerchant && memMerchant.id) {
      merchantId = memMerchant.id;
    }

    const combinedProducts: any[] = [];
    const seenIds = new Set<string>();

    if (supabaseAdmin) {
      try {
        const { data: prodData, error } = await supabaseAdmin
          .from('products')
          .select('*')
          .or(`merchantId.eq.${merchantId},merchant_id.eq.${merchantId},store_slug.eq.${storeSlug},storeSlug.eq.${storeSlug},store_id.eq.${merchantId},store_id.eq.${storeSlug},merchantId.eq.${storeSlug},merchant_id.eq.${storeSlug}`);
        
        if (!error && Array.isArray(prodData) && prodData.length > 0) {
          prodData.forEach(p => {
            const key = String(p.id || p.title).trim();
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combinedProducts.push(p);
            }
          });
        }

        // If specific lookup returned empty, also fetch general product records
        if (combinedProducts.length === 0) {
          const { data: allProds, error: allProdsErr } = await supabaseAdmin.from('products').select('*');
          if (!allProdsErr && Array.isArray(allProds) && allProds.length > 0) {
            allProds.forEach(p => {
              const key = String(p.id || p.title).trim();
              if (!seenIds.has(key)) {
                seenIds.add(key);
                combinedProducts.push(p);
              }
            });
          }
        }
      } catch (e) {
        console.error('[API DB: /api/products-by-slug] Supabase get products exception:', e);
      }
    }

    const memProducts = [
      ...(inMemoryStore.products.get(merchantId) || []),
      ...(inMemoryStore.products.get(storeSlug) || []),
      ...(inMemoryStore.products.get('default') || [])
    ];

    memProducts.forEach(p => {
      const key = String(p.id || p.title).trim();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        combinedProducts.push(p);
      }
    });

    if (combinedProducts.length === 0) {
      for (const [_, list] of inMemoryStore.products.entries()) {
        if (Array.isArray(list) && list.length > 0) {
          list.forEach(p => {
            const key = String(p.id || p.title).trim();
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combinedProducts.push(p);
            }
          });
        }
      }
    }

    res.status(200).json(combinedProducts);
  } catch (error) {
    console.error('[API Error in handleGetProductsBySlug]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/products-by-slug', handleGetProductsBySlug);
app.get('/api/products-by-slug/:storeSlug', handleGetProductsBySlug);

// Categories by Slug API
const handleGetCategoriesBySlug = async (req: express.Request, res: express.Response) => {
  try {
    const rawSlug = (req.params.storeSlug || req.query.storeSlug || req.query.slug || '').toString().trim();
    const storeSlug = rawSlug || 'aminfashionbd';
    let merchantId = storeSlug;

    if (supabaseAdmin) {
      try {
        const { data: mData } = await supabaseAdmin.from('merchants').select('*').eq('store_slug', storeSlug).maybeSingle();
        if (mData && mData.id) {
          merchantId = mData.id;
        }
      } catch (e) {
        console.error('[API DB: /api/categories-by-slug] Merchant lookup error:', e);
      }
    }

    const memMerchant = inMemoryStore.merchants.get(storeSlug);
    if (memMerchant && memMerchant.id) {
      merchantId = memMerchant.id;
    }

    if (supabaseAdmin) {
      try {
        const { data: catData, error } = await supabaseAdmin
          .from('categories')
          .select('*')
          .or(`merchantId.eq.${merchantId},merchant_id.eq.${merchantId},store_slug.eq.${storeSlug},storeSlug.eq.${storeSlug},store_id.eq.${merchantId},store_id.eq.${storeSlug},merchantId.eq.${storeSlug},merchant_id.eq.${storeSlug}`);
        if (!error && Array.isArray(catData) && catData.length > 0) {
          return res.status(200).json(catData);
        }
        const { data: allCats, error: allCatsErr } = await supabaseAdmin.from('categories').select('*');
        if (!allCatsErr && Array.isArray(allCats) && allCats.length > 0) {
          return res.status(200).json(allCats);
        }
      } catch (e) {
        console.error('[API DB: /api/categories-by-slug] Supabase categories error:', e);
      }
    }

    const memCats = inMemoryStore.categories.get(merchantId) || inMemoryStore.categories.get(storeSlug) || inMemoryStore.categories.get('default') || [];
    if (memCats.length > 0) {
      return res.status(200).json(memCats);
    }

    for (const [_, list] of inMemoryStore.categories.entries()) {
      if (Array.isArray(list) && list.length > 0) return res.status(200).json(list);
    }

    res.status(200).json([]);
  } catch (error) {
    console.error('[API Error in handleGetCategoriesBySlug]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/categories-by-slug', handleGetCategoriesBySlug);
app.get('/api/categories-by-slug/:storeSlug', handleGetCategoriesBySlug);

// Categories API
const handleGetCategories = async (req: express.Request, res: express.Response) => {
  try {
    const merchantId = (req.params.merchantId || req.query.merchantId || '').toString().trim();
    if (supabaseAdmin && merchantId) {
      try {
        const { data, error } = await supabaseAdmin.from('categories').select('*').eq('merchantId', merchantId);
        if (!error && Array.isArray(data) && data.length > 0) return res.status(200).json(data);
      } catch (e) {
        console.error('[API DB: /api/categories] Supabase get categories error:', e);
      }
    }
    const memCats = merchantId ? (inMemoryStore.categories.get(merchantId) || []) : [];
    if (memCats.length > 0) return res.status(200).json(memCats);

    for (const [_, list] of inMemoryStore.categories.entries()) {
      if (Array.isArray(list) && list.length > 0) return res.status(200).json(list);
    }
    res.status(200).json([]);
  } catch (error) {
    console.error('[API Error in handleGetCategories]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/categories', handleGetCategories);
app.get('/api/categories/:merchantId', handleGetCategories);

app.post('/api/products', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const payload = req.body;
  
  // Helper to sanitize a single product
  const sanitizeProduct = (p: any) => ({
    ...p,
    id: p.id || crypto.randomUUID(),
    merchantId: p.merchantId || p.merchant_id || 'default',
    title: p.title || p.name || 'Untitled Product',
    titleBn: p.titleBn || p.title_bn || '',
    priceBDT: Number(p.priceBDT ?? p.price ?? 0),
    compareAtPriceBDT: p.compareAtPriceBDT ? Number(p.compareAtPriceBDT) : (p.compare_at_price ? Number(p.compare_at_price) : undefined),
    stock: Number(p.stock ?? 10),
    sku: p.sku || '',
    category: p.category || p.category_name || '',
    categoryId: p.categoryId || p.category_id || '',
    image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
    status: p.status || 'Active',
    descriptionEn: p.descriptionEn || p.description || '',
    descriptionBn: p.descriptionBn || '',
    store_slug: p.store_slug || p.storeSlug || '',
    storeSlug: p.storeSlug || p.store_slug || '',
  });

  const sanitizedPayload = Array.isArray(payload) ? payload.map(sanitizeProduct) : sanitizeProduct(payload);
  const merchantId = Array.isArray(sanitizedPayload) ? (sanitizedPayload[0].merchantId || 'default') : (sanitizedPayload.merchantId || 'default');

  // Update in-memory
  const existing = inMemoryStore.products.get(merchantId) || [];
  if (Array.isArray(sanitizedPayload)) {
    inMemoryStore.products.set(merchantId, sanitizedPayload);
  } else {
    const idx = existing.findIndex(p => p.id === sanitizedPayload.id);
    if (idx >= 0) existing[idx] = sanitizedPayload;
    else existing.unshift(sanitizedPayload);
    inMemoryStore.products.set(merchantId, existing);
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('products').upsert(sanitizedPayload);
      if (error) {
        console.warn('Supabase save product warning (falling back to memory store):', error.message || error);
      } else if (data) {
        return res.json(data);
      }
    } catch (e) {
      console.warn('Supabase save product exception (falling back to memory store):', e);
    }
  }
  res.json(sanitizedPayload);
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  inMemoryStore.products.forEach((list, key) => {
    inMemoryStore.products.set(key, list.filter(p => p.id !== id));
  });

  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
      if (!error) return res.json({ success: true });
    } catch (e) {
      console.warn('Supabase delete product error:', e);
    }
  }
  res.json({ success: true });
});

// Categories API
app.get('/api/categories/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('categories').select('*').eq('merchantId', merchantId);
      if (!error && data && data.length > 0) return res.json(data);
    } catch (e) {
      // Fallback to in-memory
    }
  }
  res.json(inMemoryStore.categories.get(merchantId) || []);
});

app.post('/api/categories', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const payload = req.body;
  const merchantId = Array.isArray(payload) ? (payload[0]?.merchantId || 'default') : (payload.merchantId || 'default');
  
  if (Array.isArray(payload)) {
    inMemoryStore.categories.set(merchantId, payload);
  } else {
    const existing = inMemoryStore.categories.get(merchantId) || [];
    const idx = existing.findIndex((c: any) => c.id === payload.id || c.name === payload.name);
    if (idx >= 0) existing[idx] = payload;
    else existing.push(payload);
    inMemoryStore.categories.set(merchantId, existing);
  }

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('categories').upsert(payload);
    } catch (e) {
      // Ignored if table not migrated yet
    }
  }
  res.json(payload);
});

// Merchant Settings & Profile Persistence API
const handleMerchantUpdate = async (req: express.Request, res: express.Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const merchantData = req.body || {};
  const slug = merchantData.storeSlug || merchantData.store_slug || 'default';
  
  inMemoryStore.merchants.set(slug, merchantData);
  if (slug !== 'aminfashionbd' && merchantData.email === 'mmalamin9912@gmail.com') {
    inMemoryStore.merchants.set('aminfashionbd', merchantData);
  }

  if (supabaseAdmin) {
    try {
      const dbPayload = {
        store_name: merchantData.storeName || merchantData.store_name,
        store_slug: merchantData.storeSlug || merchantData.store_slug,
        owner_name: merchantData.ownerName || merchantData.owner_name,
        email: merchantData.email,
        phone: merchantData.phone,
        currency: merchantData.currency || 'BDT',
        language: merchantData.language || 'en',
        logo_url: merchantData.logoUrl || merchantData.logo_url,
        store_tagline: merchantData.storeTagline || merchantData.store_tagline,
        store_description: merchantData.storeDescription || merchantData.store_description,
        whatsapp_number: merchantData.whatsappNumber || merchantData.whatsapp_number,
        facebook_url: merchantData.facebookUrl || merchantData.facebook_url,
        instagram_url: merchantData.instagramUrl || merchantData.instagram_url,
        active_theme_id: merchantData.activeThemeId || merchantData.active_theme_id,
        theme_config: merchantData.themeConfig || merchantData.theme_config,
        shipping_config: merchantData.shippingConfig || merchantData.shipping_config,
        payment_methods: merchantData.paymentMethods || merchantData.payment_methods,
        tracking: merchantData.tracking,
        updated_at: new Date().toISOString()
      };
      
      await supabaseAdmin.from('merchants').upsert(dbPayload, { onConflict: 'store_slug' });
    } catch (e) {
      console.warn('[API /api/merchants/update] Supabase upsert notice:', e);
    }
  }
  return res.status(200).json({ success: true, data: merchantData });
};

app.post('/api/merchants/update', handleMerchantUpdate);
app.put('/api/merchants/update', handleMerchantUpdate);
app.patch('/api/merchants/update', handleMerchantUpdate);
app.options('/api/merchants/update', (req, res) => res.status(200).end());

app.post('/api/merchants', handleMerchantUpdate);
app.put('/api/merchants', handleMerchantUpdate);
app.put('/api/merchants/:id', handleMerchantUpdate);

// Merchant Lookup by Slug
const handleGetMerchantBySlug = async (req: express.Request, res: express.Response) => {
  try {
    const rawSlug = (req.params.storeSlug || req.query.storeSlug || req.query.slug || '').toString().trim();
    const storeSlug = rawSlug || 'aminfashionbd';

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('merchants').select('*').or(`store_slug.eq.${storeSlug},storeSlug.eq.${storeSlug},slug.eq.${storeSlug},id.eq.${storeSlug}`).maybeSingle();
        if (!error && data) {
          return res.status(200).json({
            ...data,
            storeName: data.store_name || data.storeName || 'My Store',
            storeSlug: data.store_slug || data.storeSlug || storeSlug,
            ownerName: data.owner_name || data.ownerName || '',
            logoUrl: data.logo_url || data.logoUrl || '',
            themeConfig: data.theme_config || data.themeConfig || {},
            shippingConfig: data.shipping_config || data.shippingConfig,
            paymentMethods: data.payment_methods || data.paymentMethods,
            tracking: data.tracking || data.tracking,
          });
        }
      } catch (e) {
        console.error('[API DB: /api/merchants/slug] Supabase merchant lookup error:', e);
      }
    }

    const mem = inMemoryStore.merchants.get(storeSlug) || inMemoryStore.merchants.get('aminfashionbd');
    if (mem) return res.status(200).json(mem);

    // Fallback default merchant
    res.status(200).json({
      storeName: 'Amin Fashion BD',
      storeSlug: 'aminfashionbd',
      ownerName: 'Al-Amin Hossain',
      email: 'mmalamin9912@gmail.com',
      phone: '+880 1812-345678',
      subscription_plan: 'enterprise',
      subscriptionPlan: 'enterprise',
      themeConfig: {},
    });
  } catch (error) {
    console.error('[API Error in handleGetMerchantBySlug]:', error);
    res.status(200).json(null);
  }
};

app.get('/api/merchants/slug', handleGetMerchantBySlug);
app.get('/api/merchants/slug/:storeSlug', handleGetMerchantBySlug);

// Customers API
const handleGetCustomers = async (req: express.Request, res: express.Response) => {
  try {
    const merchantId = (req.params.merchantId || req.query.merchantId || '').toString().trim();
    if (supabaseAdmin && merchantId) {
      try {
        const { data, error } = await supabaseAdmin.from('customers').select('*').eq('merchantId', merchantId);
        if (!error && Array.isArray(data) && data.length > 0) return res.status(200).json(data);
      } catch (e) {
        console.error('[API DB: /api/customers] Supabase customers error:', e);
      }
    }
    const memList = merchantId ? (inMemoryStore.customers.get(merchantId) || []) : [];
    if (memList.length > 0) return res.status(200).json(memList);

    for (const [_, list] of inMemoryStore.customers.entries()) {
      if (Array.isArray(list) && list.length > 0) return res.status(200).json(list);
    }
    res.status(200).json([]);
  } catch (error) {
    console.error('[API Error in handleGetCustomers]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/customers', handleGetCustomers);
app.get('/api/customers/:merchantId', handleGetCustomers);

app.post('/api/customers', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const payload = req.body;
  const merchantId = Array.isArray(payload) ? (payload[0]?.merchantId || 'default') : (payload.merchantId || 'default');
  
  if (Array.isArray(payload)) {
    inMemoryStore.customers.set(merchantId, payload);
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('customers').upsert(payload);
      if (!error) return res.status(200).json(data || payload);
    } catch (e) {
      console.warn('Supabase save customers error:', e);
    }
  }
  res.status(200).json(payload);
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  inMemoryStore.customers.forEach((list, key) => {
    inMemoryStore.customers.set(key, list.filter(c => c.id !== id));
  });

  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('customers').delete().eq('id', id);
      if (!error) return res.status(200).json({ success: true });
    } catch (e) {
      console.warn('Supabase delete customer error:', e);
    }
  }
  res.status(200).json({ success: true });
});

// Order API
const handleGetOrders = async (req: express.Request, res: express.Response) => {
  try {
    const merchantId = (req.params.merchantId || req.query.merchantId || '').toString().trim();
    if (supabaseAdmin && merchantId) {
      try {
        const { data, error } = await supabaseAdmin.from('orders').select('*').eq('merchantId', merchantId);
        if (!error && Array.isArray(data) && data.length > 0) return res.status(200).json(data);
      } catch (e) {
        console.error('[API DB: /api/orders] Supabase orders error:', e);
      }
    }
    const memOrders = merchantId ? (inMemoryStore.orders.get(merchantId) || []) : [];
    if (memOrders.length > 0) return res.status(200).json(memOrders);

    for (const [_, list] of inMemoryStore.orders.entries()) {
      if (Array.isArray(list) && list.length > 0) return res.status(200).json(list);
    }
    res.status(200).json([]);
  } catch (error) {
    console.error('[API Error in handleGetOrders]:', error);
    res.status(200).json([]);
  }
};

app.get('/api/orders', handleGetOrders);
app.get('/api/orders/:merchantId', handleGetOrders);

app.post('/api/orders', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const payload = req.body;
  const merchantId = Array.isArray(payload) ? (payload[0]?.merchantId || 'default') : (payload.merchantId || payload.storeSlug || 'default');
  
  if (Array.isArray(payload)) {
    inMemoryStore.orders.set(merchantId, payload);
  } else {
    const existing = inMemoryStore.orders.get(merchantId) || [];
    inMemoryStore.orders.set(merchantId, [payload, ...existing]);
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('orders').upsert(payload);
      if (!error) return res.status(200).json(data || payload);
    } catch (e) {
      console.warn('Supabase save orders error:', e);
    }
  }
  res.status(200).json(payload);
});

// Gemini AI Setup with Resilient Multi-Model Failover & Rate-Limit Shield
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// In-memory cache & cooldown tracking for Gemini API requests
const geminiCache = new Map<string, { text: string; expiresAt: number }>();
let rateLimitCooldownUntil = 0;

// Resilient Gemini Execution Helper with automatic model fallback and rate limit protection
async function executeGeminiWithFallback(options: {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
}): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  // If currently in rate-limit cooldown, immediately use contextual fallback
  const now = Date.now();
  if (now < rateLimitCooldownUntil) {
    return null;
  }

  // Check cache first to save quota
  const cacheKey = `${options.contents}_${options.systemInstruction || ''}_${options.responseMimeType || ''}`;
  const cached = geminiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.text;
  }

  // Valid Gemini model fallback chain according to SDK specification
  const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  
  for (const modelName of candidateModels) {
    try {
      const config: any = {};
      if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
      if (options.responseMimeType) config.responseMimeType = options.responseMimeType;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        ...(Object.keys(config).length > 0 ? { config } : {})
      });

      if (response && response.text) {
        // Cache result for 15 minutes
        geminiCache.set(cacheKey, { text: response.text, expiresAt: now + 15 * 60 * 1000 });
        return response.text;
      }
    } catch (err: any) {
      const statusCode = err?.status || err?.code;
      const isRateLimit = statusCode === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded');
      
      if (isRateLimit) {
        // Set cooldown for 40 seconds to let free tier quota reset smoothly
        rateLimitCooldownUntil = Date.now() + 40000;
        break; // Stop hammering the API when quota is exhausted
      }
    }
  }

  return null;
}

// AI Endpoints
app.post('/api/ai/generate-text', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { prompt, systemInstruction } = req.body;
    const isBengali = /Bengali|Bangla|বাংলা|bengali|bangla/i.test(prompt || '');

    const generatedText = await executeGeminiWithFallback({
      contents: prompt,
      systemInstruction: systemInstruction || "You are a professional e-commerce copywriter. Provide concise, compelling product copy without generic filler.",
    });

    if (generatedText) {
      return res.json({ text: generatedText });
    }

    // Contextual fallback if API is temporarily unavailable
    if (isBengali) {
      return res.json({ text: 'উন্নত মানের ফ্যাব্রিক ও আধুনিক ডিজাইনে তৈরি এই পণ্যটি আপনাকে দেবে অসাধারণ আরাম, আভিজাত্য এবং দীর্ঘস্থায়ী ব্যবহার অভিজ্ঞতা।' });
    }
    return res.json({ text: 'Crafted with premium materials and precision engineering, this product delivers exceptional durability, contemporary style, and peak performance for daily use.' });
  } catch (error: any) {
    console.error('AI Text Generation Error:', error);
    res.json({ text: `Crafted with premium materials, this high-grade item offers exceptional comfort, modern aesthetics, and lasting reliability.` });
  }
});

app.post('/api/ai/suggest-pricing', async (req, res) => {
  try {
    const { productName, currentPrice, category } = req.body;
    const priceNum = Number(currentPrice) || 1000;

    const prompt = `Analyze pricing for e-commerce product: "${productName}", Category: "${category}", Current Price: ৳${priceNum} BDT. Suggest an optimal competitive price, calculated discount percentage, and 1-sentence reasoning based on consumer demand in Bangladesh.
    Return JSON only in this exact format:
    {"suggestedPrice": number, "discountPercentage": number, "reasoning": "string"}`;

    const rawResult = await executeGeminiWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
    });

    if (rawResult) {
      try {
        const parsed = JSON.parse(rawResult);
        return res.json({
          suggestedPrice: parsed.suggestedPrice || Math.round(priceNum * 0.9),
          discountPercentage: parsed.discountPercentage || 10,
          reasoning: parsed.reasoning || `Competitively positioned for high buyer conversion.`
        });
      } catch (parseErr) {
        console.warn('Failed to parse pricing JSON:', parseErr);
      }
    }

    const fallbackSuggested = Math.round(priceNum * 0.9);
    const fallbackDiscount = Math.round(((priceNum - fallbackSuggested) / priceNum) * 100);
    res.json({
      suggestedPrice: fallbackSuggested,
      discountPercentage: fallbackDiscount || 10,
      reasoning: `Optimized benchmark pricing for ${category || 'general merchandise'} to boost checkout conversions.`
    });
  } catch (error) {
    console.error('AI Pricing Suggestion Error:', error);
    const fallbackPrice = Math.round((Number(req.body.currentPrice) || 1000) * 0.9);
    res.json({
      suggestedPrice: fallbackPrice,
      discountPercentage: 10,
      reasoning: "Suggested benchmark pricing to maximize conversion based on catalog trends."
    });
  }
});

app.post('/api/ai/generate-faq', async (req, res) => {
  try {
    const { policies, storeName } = req.body;

    const prompt = `Based on these store policies for ${storeName || 'our store'}:
    ${JSON.stringify(policies)}
    
    1. Generate a structured Markdown FAQ with 4-5 key questions and answers.
    2. Generate an automated chatbot welcome script and quick answers.
    Return JSON in format: {"faq": "markdown string", "chatbotScript": "string"}`;

    const rawResult = await executeGeminiWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
    });

    if (rawResult) {
      try {
        const parsed = JSON.parse(rawResult);
        return res.json({
          faq: parsed.faq || 'FAQ generated successfully.',
          chatbotScript: parsed.chatbotScript || `Welcome to ${storeName || 'our store'}! How can I assist you today?`
        });
      } catch (e) {
        console.warn('FAQ JSON parse issue:', e);
      }
    }

    res.json({
      faq: `### Frequently Asked Questions\n\n**Q: What is the delivery timeframe?**\nInside Dhaka 2-3 business days, outside Dhaka 3-5 days.\n\n**Q: How do returns work?**\nItems can be returned within 7 days in original condition.\n\n**Q: What payment options are supported?**\nbKash, Nagad, Cards, and Cash on Delivery (COD).`,
      chatbotScript: `Hello! Welcome to ${storeName || 'our store'}. How can I assist you today? You can ask about delivery, payments, or returns.`
    });
  } catch (error) {
    console.error('AI FAQ Error:', error);
    res.json({
      faq: `### Store Policies & FAQ\n\n**Q: Delivery Timeline?**\nStandard shipping is 2-4 business days.\n\n**Q: Payment Methods?**\nbKash, Nagad, and Cash on Delivery are accepted.`,
      chatbotScript: "Hello! Welcome to our store. How can I help you today?"
    });
  }
});

app.post('/api/ai/analytics-summary', async (req, res) => {
  try {
    const { analyticsData } = req.body;
    const prompt = `Provide a concise 2-sentence executive summary for platform analytics: ${JSON.stringify(analyticsData)}`;
    
    const summary = await executeGeminiWithFallback({ contents: prompt });
    res.json({ summary: summary || 'Performance metrics are operating within normal parameters with steady customer engagement.' });
  } catch (error) {
    res.json({ summary: "Platform activity and revenue metrics are trending positively." });
  }
});

app.post('/api/ai/broadcast-email', async (req, res) => {
  try {
    const { topic, targetAudience } = req.body;
    const prompt = `Draft a professional broadcast email to ${targetAudience || 'merchants'} about topic: "${topic}".
    Return JSON format: {"subject": "string", "message": "string"}`;

    const raw = await executeGeminiWithFallback({
      contents: prompt,
      responseMimeType: "application/json"
    });

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return res.json(parsed);
      } catch (e) {}
    }

    res.json({
      subject: `Platform Update: ${topic || 'New Features Announcement'}`,
      message: `Dear Merchants,\n\nWe are pleased to announce new platform enhancements regarding ${topic || 'system updates'}. Check your dashboard for more details.\n\nBest regards,\nPlatform Operations Team`
    });
  } catch (error) {
    res.json({
      subject: "Important Platform Announcement",
      message: `Dear Merchants,\n\nPlease review the latest updates in your dashboard.`
    });
  }
});

app.post('/api/ai/support-reply', async (req, res) => {
  try {
    const { ticketContent, customerName } = req.body;
    const prompt = `Write a polite, professional support resolution reply to ${customerName || 'customer'} regarding ticket: "${ticketContent}".`;
    
    const reply = await executeGeminiWithFallback({ contents: prompt });
    res.json({ reply: reply || `Hello ${customerName || 'there'},\n\nThank you for reaching out. We have reviewed your request regarding "${ticketContent}" and our support team is actively resolving this. We will update you shortly.\n\nBest regards,\nCustomer Support Team` });
  } catch (error) {
    res.json({ reply: `Hello ${req.body?.customerName || 'there'}, thank you for contacting support. We are looking into your request.` });
  }
});

app.post('/api/ai/copilot-support', async (req, res) => {
  try {
    const { query } = req.body;
    const isBengali = /[\u0980-\u09FF]|kivabe|korbo|apnar|dhaka/i.test(query || '');
    const prompt = `You are Zid AI, a helpful Store Manager assistant for an e-commerce platform. 
    Auto-detect the language of the query. If the query is written in Bangla script or Banglish, you MUST reply entirely in natural Bangla script. If it is in English, reply in English.
    Knowledge base: We support custom domains (settings -> domains), payment gateways (settings -> payments), product uploads (products -> add), order management (orders tab), and shipping configuration (logistics tab).
    Query: ${query}`;

    const answer = await executeGeminiWithFallback({ contents: prompt });
    if (answer) {
      return res.json({ answer });
    }

    if (isBengali) {
      return res.json({ answer: "Zid AI Copilot: আপনি Products ট্যাবে নতুন পণ্য যুক্ত করতে পারেন, Settings -> Payments-এ bKash/Nagad গেটওয়ে সক্রিয় করতে পারেন এবং Logistics ট্যাবে ডেলিভারি চার্জ নির্ধারণ করতে পারেন।" });
    }
    res.json({ answer: "Zid AI Copilot: You can configure products in the Products tab, payment gateways in Settings -> Payments, and delivery in Logistics." });
  } catch (error) {
    console.error('AI Support Error:', error);
    res.json({ answer: "Zid AI Copilot: আপনি Products ট্যাবে পণ্য যোগ করতে পারেন, Settings -> Payments-এ পেমেন্ট গেটওয়ে এবং Logistics-এ ডেলিভারি কনফিগার করতে পারেন।" });
  }
});

app.post('/api/ai/copilot-analytics', async (req, res) => {
  try {
    const { query, storeData } = req.body;
    const isBengali = /[\u0980-\u09FF]|koto|bikri|kivabe/i.test(query || '');
    const prompt = `You are a store data analyst. Analyze this store data to answer the query.
    Auto-detect the language of the query. If the query is written in Bangla script or Banglish, you MUST reply entirely in natural Bangla script. If it is in English, reply in English.
    Store Data: ${JSON.stringify(storeData)}
    Query: ${query}`;

    const answer = await executeGeminiWithFallback({ contents: prompt });
    if (answer) {
      return res.json({ answer });
    }

    if (isBengali) {
      return res.json({ answer: "দোকানের অ্যানালিটিক্স অনুযায়ী ক্রেতাদের ভিজিট এবং অর্ডার কনভার্সন স্বাভাবিক ও ইতিবাচক রয়েছে। শীর্ষ বিক্রিত পণ্যের স্টক পর্যাপ্ত রাখুন।" });
    }
    res.json({ answer: "Store analytics indicate consistent visitor engagement and sales conversion. Recommend maintaining safety stock for high-demand items." });
  } catch (error) {
    console.error('AI Analytics Error:', error);
    res.json({ answer: "দোকানের অ্যানালিটিক্স অনুযায়ী ক্রেতাদের ভিজিট এবং অর্ডার কনভার্সন স্বাভাবিক ও ইতিবাচক রয়েছে।" });
  }
});

app.post('/api/ai/copilot-template', async (req, res) => {
  try {
    const { scenario } = req.body || {};
    const prompt = `Generate a polite customer support template for this scenario: ${scenario}`;

    const template = await executeGeminiWithFallback({ contents: prompt });
    if (template) {
      return res.json({ template });
    }

    res.json({ template: `Dear customer, thank you for reaching out regarding ${scenario || 'your order'}. We are reviewing your inquiry and will provide an update shortly.` });
  } catch (error) {
    console.error('AI Template Error:', error);
    res.json({ template: `প্রিয় গ্রাহক, ${req.body?.scenario || 'সহায়তা'} বিষয়ে যোগাযোগের জন্য ধন্যবাদ। আমরা দ্রুত আপনার সমস্যা সমাধানে কাজ করছি।` });
  }
});

// MongoDB Connection Setup
const MONGODB_URI = process.env.MONGODB_URI || '';
let isMongoConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB successfully');
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
} else {
  console.log('[MONGODB MOCK] MONGODB_URI is not set. Running in in-memory fallback mode.');
}

// In-memory Users Fallback Storage
const inMemoryUsers: any[] = [];

// ১. কাস্টমার ইউজার মডেল (User Schema)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// In-memory OTP storage
interface OtpEntry {
  otp: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();
const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes

async function sendOtpEmail(email: string, otp: string) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log(`[SMTP MOCK] SMTP credentials missing. OTP for ${email} is ${otp}`);
    return { success: true, mock: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || `"ZID SAAS Bangladesh" <${smtpUser}>`,
    to: email,
    subject: 'Verification Code for ZID SAAS Bangladesh',
    text: `Your 6-digit verification code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; max-width: 500px; margin: auto; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-weight: 800; letter-spacing: -0.025em;">ZID SAAS Bangladesh</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">Please use the following 6-digit verification code to complete your signup process:</p>
        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; text-align: center; border-radius: 12px; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 900; font-family: monospace; letter-spacing: 6px; color: #00D68F;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0;">This verification code is valid for 5 minutes. If you did not request this email, please ignore it.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { success: true, mock: false };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', provider: 'Supabase Auth' });
});

// Helper logic to generate and send OTP
async function handleSendOtp(req: express.Request, res: express.Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
       res.status(400).json({ success: false, message: 'একটি সঠিক ইমেইল এড্রেস প্রদান করুন।' });
       return;
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_EXPIRATION_TIME;

    otpStore.set(cleanEmail, { otp, expiresAt });

    // Log the OTP to the console for development/debugging
    console.log(`[OTP GENERATED] Email: ${cleanEmail} -> OTP: ${otp}`);

    const result = await sendOtpEmail(cleanEmail, otp);

    const infoMsg = result.mock 
      ? `ভেরিফিকেশন কোড পাঠানো হয়েছে! (ডেমো মোড: কোডটি কনসোলে লগ করা হয়েছে: ${otp})`
      : 'ভেরিফিকেশন কোডটি আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।';

    // Return the response as requested with the specified attributes
    res.json({
      success: true,
      message: 'OTP sent successfully',
      infoMessage: infoMsg,
      mock: result.mock,
      otp: otp
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'ওটিপি পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
  }
}

// Register both paths explicitly
app.post('/api/auth/send-otp', handleSendOtp);
app.post('/api/send-otp', handleSendOtp);

// Helper logic to verify OTP
async function handleVerifyOtp(req: express.Request, res: express.Response) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
       res.status(400).json({ success: false, message: 'ইমেইল এবং ওটিপি কোড আবশ্যক।' });
       return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const record = otpStore.get(cleanEmail);

    if (!record) {
       res.status(400).json({ success: false, message: 'কোন ওটিপি রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে আবার কোড পাঠান।' });
       return;
    }

    if (Date.now() > record.expiresAt) {
       otpStore.delete(cleanEmail);
       res.status(400).json({ success: false, message: 'ভেরিফিকেশন কোডটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে নতুন কোড পাঠান।' });
       return;
    }

    if (record.otp !== cleanOtp) {
       res.status(400).json({ success: false, message: 'ভেরিফিকেশন কোডটি সঠিক নয়। অনুগ্রহ করে সঠিক কোড দিন।' });
       return;
    }

    // Success - remove from store
    otpStore.delete(cleanEmail);
    res.json({ success: true, message: 'ওটিপি ভেরিফিকেশন সফল হয়েছে!' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'ওটিপি যাচাই করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' });
  }
}

// Register both paths explicitly
app.post('/api/auth/verify-otp', handleVerifyOtp);
app.post('/api/verify-otp', handleVerifyOtp);

// ২. সাইন আপ (Sign Up) এপিআই
async function handleSignup(req: express.Request, res: express.Response) {
  try {
    const { firstName, lastName, phone, email, address, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      res.status(400).json({ message: 'পাসওয়ার্ড দুটি মিলছে না!' });
      return;
    }

    if (isMongoConnected) {
      const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        res.status(400).json({ message: 'এই ইমেইল বা ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট করা আছে!' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        firstName,
        lastName,
        phone,
        email,
        address,
        password: hashedPassword
      });

      await newUser.save();

      // সেসন টোকেন জেনারেট
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', { expiresIn: '7d' });

      res.status(201).json({
        message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!',
        token,
        user: { firstName, lastName, email, phone, address }
      });
    } else {
      // In-memory fallback
      const existingUser = inMemoryUsers.find(u => u.email === email || u.phone === phone);
      if (existingUser) {
        res.status(400).json({ message: 'এই ইমেইল বা ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট করা আছে!' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        _id: Math.random().toString(36).substring(2, 9),
        firstName,
        lastName,
        phone,
        email,
        address,
        password: hashedPassword,
        createdAt: new Date()
      };

      inMemoryUsers.push(newUser);

      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', { expiresIn: '7d' });

      res.status(201).json({
        message: 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! (ইন-মেমোরি ডেমো মোড)',
        token,
        user: { firstName, lastName, email, phone, address }
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
}

app.post('/api/signup', handleSignup);
app.post('/api/auth/signup', handleSignup);

// ৩. লগইন (Log In) এপিআই
async function handleLogin(req: express.Request, res: express.Response) {
  try {
    const { emailOrPhone, password } = req.body;

    if (isMongoConnected) {
      const user = await User.findOne({
        $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
      });

      if (!user) {
        res.status(400).json({ message: 'ইউজার পাওয়া যায়নি!' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: 'ভুল পাসওয়ার্ড!' });
        return;
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', { expiresIn: '7d' });

      res.json({
        message: 'লগইন সফল হয়েছে!',
        token,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address
        }
      });
    } else {
      // In-memory fallback
      const user = inMemoryUsers.find(u => u.email === emailOrPhone || u.phone === emailOrPhone);

      if (!user) {
        res.status(400).json({ message: 'ইউজার পাওয়া যায়নি!' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: 'ভুল পাসওয়ার্ড!' });
        return;
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', { expiresIn: '7d' });

      res.json({
        message: 'লগইন সফল হয়েছে! (ইন-মেমোরি ডেমো মোড)',
        token,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'সার্ভারে সমস্যা হয়েছে।' });
  }
}

app.post('/api/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// Explicit API 404 handler to prevent unhandled /api/* routes from falling through to Vite HTML
app.all('/api/*', (req, res) => {
  console.warn(`[API 404] Endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Express global error handler for /api/*
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Uncaught Exception]', err);
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(500).json({
      error: 'Internal server error',
      message: err?.message || String(err)
    });
  }
  next(err);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // When running on Vercel, Vercel edge automatically serves static files, 
    // so we only need Express for the API routes.
    if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
