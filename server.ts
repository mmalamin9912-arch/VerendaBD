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

function getPlanDurationInDays(planId?: string): number {
  if (!planId) return 30;
  const lower = String(planId).toLowerCase().trim();
  if (lower.includes('12m') || lower.includes('enterprise') || lower.includes('annual') || lower.includes('year') || lower === '12') {
    return 365;
  }
  if (lower.includes('6m') || lower.includes('pro') || lower.includes('half_year') || lower === '6') {
    return 180;
  }
  if (lower.includes('3m') || lower.includes('starter_3m') || lower === '3') {
    return 90;
  }
  if (lower.includes('1m') || lower.includes('starter_1m') || lower.includes('free_trial') || lower.includes('trial') || lower.includes('month') || lower === '1') {
    return 30;
  }
  if (lower.includes('starter')) return 90;
  return 30;
}

function calculatePlanTimestamps(planId?: string, startDate: Date = new Date()) {
  const durationDays = getPlanDurationInDays(planId);
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const startMs = startDate.getTime();
  const expiryMs = startMs + durationMs;
  const plan_started_at = new Date(startMs).toISOString();
  const expires_at = new Date(expiryMs).toISOString();
  const expiryDate = expires_at.split('T')[0];
  return { plan_started_at, expires_at, expiryDate, durationDays, durationMs };
}

function cleanEnvUrl(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
  return str.replace(/\/+$/, '');
}

function cleanEnvKey(raw?: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/^["'`\\]+|["'`\\]+$/g, '').trim();
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

function sanitizeServerMerchant(m: any) {
  if (!m || typeof m !== 'object') return m;
  const planId = m.subscriptionPlan || m.subscription_plan || 'free_trial';
  const isPaid = planId !== 'free_trial' && planId !== 'trial';
  const durationDays = getPlanDurationInDays(planId);
  
  const rawStart = m.plan_started_at || m.planStartedAt || m.created_at || new Date().toISOString();
  const { plan_started_at: calcStart, expires_at: calcExpiry, expiryDate } = calculatePlanTimestamps(planId, new Date(rawStart));
  
  const existingExpiryMs = m.expires_at ? new Date(m.expires_at).getTime() : 0;
  const isStale = !existingExpiryMs || isNaN(existingExpiryMs) || (isPaid && durationDays >= 90 && (existingExpiryMs - Date.now() < 35 * 86400000));
  
  const plan_started_at = isStale ? new Date().toISOString() : (m.plan_started_at || m.planStartedAt || calcStart);
  const expires_at = isStale ? new Date(Date.now() + durationDays * 86400000).toISOString() : (m.expires_at || m.expiresAt || calcExpiry);
  
  return {
    ...m,
    subscriptionPlan: planId,
    duration_days: durationDays,
    durationDays: durationDays,
    selectedPlanDays: durationDays,
    plan_started_at,
    expires_at,
    planStartedAt: plan_started_at,
    expiresAt: expires_at,
    subscriptionExpiry: isPaid ? expires_at.split('T')[0] : null,
    trialDaysRemaining: isPaid ? 0 : (m.trialDaysRemaining ?? 30),
    isLocked: false
  };
}

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

// Subscription endpoint by store name or slug
app.get('/api/subscription/by-store/:storeName', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const storeName = decodeURIComponent(req.params.storeName || '').trim();
    if (!storeName) {
      return res.status(200).json({ ok: false, subscription_plan: null, subscription_expiry: null });
    }

    const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
    const supabaseKey = cleanEnvKey(rawSupabaseKey);

    if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
      try {
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sbRes = await fetch(`${supabaseUrl}/rest/v1/merchants?or=(store_name.ilike.${encodeURIComponent(storeName)},store_slug.eq.${encodeURIComponent(slug)})&select=*&limit=1`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (sbRes.ok) {
          const rows = await sbRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const m = rows[0];
            return res.status(200).json({
              ok: true,
              subscription_plan: m.subscription_plan || m.subscriptionPlan || 'free_trial',
              subscription_expiry: m.subscription_expiry || m.subscriptionExpiry || null,
              duration_days: m.duration_days || 30,
              plan_started_at: m.plan_started_at,
              expires_at: m.expires_at
            });
          }
        }
      } catch (e) {
        console.warn('Supabase subscription lookup warning:', e);
      }
    }

    // In-memory check
    const payload = await readStorePayload();
    if (payload.merchant && (payload.merchant.storeName === storeName || payload.merchant.storeSlug === storeName.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      return res.status(200).json({
        ok: true,
        subscription_plan: payload.merchant.subscriptionPlan || 'free_trial',
        subscription_expiry: payload.merchant.subscriptionExpiry || null,
        duration_days: payload.merchant.duration_days || 30
      });
    }

    return res.status(200).json({ ok: true, subscription_plan: 'free_trial', subscription_expiry: null, duration_days: 30 });
  } catch (err: any) {
    return res.status(200).json({ ok: false, error: err?.message || 'Error fetching subscription', subscription_plan: 'free_trial' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'ok', provider: 'Supabase Data Layer' });
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

app.get('/api/merchants/check/:email', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const email = (req.params.email || '').trim().toLowerCase();
  if (!email) return res.json(null);
  
  // 1. Query Supabase REST if configured
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
  const supabaseKey = cleanEnvKey(rawSupabaseKey);

  if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
    try {
      const sbRes = await fetch(`${supabaseUrl}/rest/v1/merchants?email=ilike.${encodeURIComponent(email)}&select=*&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (sbRes.ok) {
        const rows = await sbRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return res.json(sanitizeServerMerchant(rows[0]));
        }
      }
    } catch (e) {
      console.warn('Supabase merchant email check warning:', e);
    }
  }

  // 2. Check in-memory merchantStore
  for (const m of merchantStore.values()) {
    if (m && typeof m.email === 'string' && m.email.toLowerCase() === email) {
      return res.json(sanitizeServerMerchant(m));
    }
  }
  
  // 3. Check local-store.json
  const payload = await readStorePayload();
  if (payload.merchant && payload.merchant.email && String(payload.merchant.email).toLowerCase() === email) {
    return res.json(sanitizeServerMerchant(payload.merchant));
  }
  
  if (Array.isArray(payload.allMerchants)) {
    const found = payload.allMerchants.find((m: any) => m && m.email && String(m.email).toLowerCase() === email);
    if (found) return res.json(sanitizeServerMerchant(found));
  }

  return res.json(null);
});

app.get('/api/merchants/by-slug', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const slug = (req.query.slug as string || '').trim().toLowerCase();
  if (!slug) return res.json({ ok: false, merchant: null });
  
  // 1. Query Supabase REST if configured
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
  const supabaseKey = cleanEnvKey(rawSupabaseKey);

  if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
    try {
      const sbRes = await fetch(`${supabaseUrl}/rest/v1/merchants?store_slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (sbRes.ok) {
        const rows = await sbRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return res.json({ ok: true, merchant: sanitizeServerMerchant(rows[0]) });
        }
      }
    } catch (e) {
      console.warn('Supabase merchant slug check warning:', e);
    }
  }

  const inMemory = merchantStore.get(slug);
  if (inMemory) return res.json({ ok: true, merchant: sanitizeServerMerchant(inMemory) });
  
  const payload = await readStorePayload();
  if (payload.merchant && payload.merchant.storeSlug === slug) {
    return res.json({ ok: true, merchant: sanitizeServerMerchant(payload.merchant) });
  }

  return res.json({ ok: true, merchant: null });
});

app.get('/api/categories-by-slug/:slug', (req, res) => {
  const slug = (req.params.slug || '').trim().toLowerCase();
  const cats = categoryStore.get(slug) || [];
  return res.json(cats);
});

app.all('/api/tenant-store', async (req, res) => {
  const slug = (req.query.slug as string || req.body?.slug as string || '').trim().toLowerCase();
  if (!slug) return jsonError(res, 400, 'slug is required');
  const payload = await readStorePayload();
  return res.json({ ok: true, store_slug: slug, tenant: payload });
});

app.get('/api/storefront/:slug', async (req, res) => {
  const slug = (req.params.slug || '').trim().toLowerCase();
  const payload = await readStorePayload();
  return res.json({ ok: true, store_slug: slug, storefront: payload });
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

app.post('/api/subscription/update', async (req, res) => {
  try {
    const { storeName, email, storeSlug, planId } = req.body || {};
    const computed = calculatePlanTimestamps(planId, new Date());
    const duration_days = req.body?.duration_days || computed.durationDays;
    const plan_started_at = req.body?.plan_started_at || computed.plan_started_at;
    const expires_at = req.body?.expires_at || computed.expires_at;
    const expiryDate = req.body?.expiryDate || computed.expiryDate;

    const payload = await readStorePayload();
    if (payload.merchant) {
      payload.merchant.subscriptionPlan = planId;
      payload.merchant.subscriptionExpiry = expiryDate;
      payload.merchant.plan_started_at = plan_started_at;
      payload.merchant.expires_at = expires_at;
      payload.merchant.planStartedAt = plan_started_at;
      payload.merchant.expiresAt = expires_at;
      payload.merchant.duration_days = duration_days;
      payload.merchant.durationDays = duration_days;
      payload.merchant.selectedPlanDays = duration_days;
      payload.merchant.trialDaysRemaining = 0;
      payload.merchant.trialEndsAt = undefined;
    }
    if (Array.isArray(payload.allMerchants)) {
      payload.allMerchants = payload.allMerchants.map((m: any) => {
        if (m && ((storeName && m.storeName === storeName) || (email && m.email === email) || (storeSlug && m.storeSlug === storeSlug))) {
          return {
            ...m,
            subscriptionPlan: planId,
            subscriptionExpiry: expiryDate,
            plan_started_at,
            expires_at,
            planStartedAt: plan_started_at,
            expiresAt: expires_at,
            duration_days,
            durationDays: duration_days,
            selectedPlanDays: duration_days,
            trialDaysRemaining: 0,
            trialEndsAt: undefined
          };
        }
        return m;
      });
    }
    await writeStorePayload(payload);

    if (storeSlug) {
      const mem = merchantStore.get(storeSlug);
      if (mem) {
        merchantStore.set(storeSlug, {
          ...mem,
          subscriptionPlan: planId,
          subscriptionExpiry: expiryDate,
          plan_started_at,
          expires_at,
          duration_days
        });
      }
    }

    res.json({ status: 'ok', updated: true, plan_started_at, expires_at, duration_days });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err?.message });
  }
});

function normalizeServerPhone(rawPhone: string, defaultCountryCode?: string): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+880')) {
    const rest = cleaned.slice(4).replace(/^0+/, '');
    return `+880${rest}`;
  }
  if (cleaned.startsWith('880')) {
    const rest = cleaned.slice(3).replace(/^0+/, '');
    return `+880${rest}`;
  }
  if (cleaned.startsWith('+966')) {
    const rest = cleaned.slice(4).replace(/^0+/, '');
    return `+966${rest}`;
  }
  if (cleaned.startsWith('966')) {
    const rest = cleaned.slice(3).replace(/^0+/, '');
    return `+966${rest}`;
  }

  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+880${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return `+966${cleaned.slice(1)}`;
  }

  const local = cleaned.replace(/^\+/, '').replace(/^0+/, '');
  const prefix = defaultCountryCode ? (defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`) : '+880';
  return `${prefix}${local}`;
}

// Real Supabase-backed WhatsApp OTP Verification Session Store & Multi-Provider Dispatcher
interface WhatsAppDeliveryResult {
  sent: boolean;
  provider: string;
  details?: string;
  error?: string;
  directLink?: string;
}

async function dispatchLiveWhatsAppMessage(phone: string, code: string, userType: string): Promise<WhatsAppDeliveryResult> {
  const isKsa = phone.startsWith('+966');
  const digitsOnly = phone.replace(/[^\d]/g, '');
  
  // Message payload in English and Bengali / Arabic
  const messageBody = isKsa
    ? `*Zid E-Commerce Platform Verification*\n\nYour 6-digit WhatsApp OTP verification code is:\n*${code}*\n\nرمز التحقق الخاص بك هو: *${code}*\n(Valid for 10 minutes. Do not share this code with anyone.)`
    : `*Zid E-Commerce Platform Verification*\n\nYour 6-digit WhatsApp OTP verification code is:\n*${code}*\n\nআপনার যাচাইকরণ কোড হলো: *${code}*\n(Valid for 10 minutes. Do not share this code with anyone.)`;

  const directLink = `https://api.whatsapp.com/send?phone=${digitsOnly}&text=${encodeURIComponent(messageBody)}`;

  // 1. Check UltraMsg Provider
  const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID || process.env.WHATSAPP_ULTRAMSG_INSTANCE_ID;
  const ultraToken = process.env.ULTRAMSG_TOKEN || process.env.WHATSAPP_ULTRAMSG_TOKEN;
  if (ultraInstance && ultraToken) {
    try {
      const ultraRes = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: ultraToken,
          to: digitsOnly,
          body: messageBody
        })
      });
      const ultraData: any = await ultraRes.json();
      if (ultraData && (ultraData.sent === 'true' || ultraData.sent === true || ultraData.id)) {
        console.log(`[WhatsApp UltraMsg Success] Dispatched to ${phone}, ID: ${ultraData.id}`);
        return { sent: true, provider: 'UltraMsg', details: `Message ID: ${ultraData.id}`, directLink };
      } else {
        console.warn('[WhatsApp UltraMsg Response Warning]', ultraData);
      }
    } catch (e: any) {
      console.warn('[WhatsApp UltraMsg Exception]', e?.message);
    }
  }

  // 2. Check Twilio WhatsApp Provider
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || '+14155238886';
  if (twilioAccountSid && twilioAuthToken) {
    try {
      const twilioFrom = twilioFromNumber.startsWith('whatsapp:') ? twilioFromNumber : `whatsapp:${twilioFromNumber}`;
      const twilioTo = `whatsapp:${phone.startsWith('+') ? phone : '+' + phone}`;
      const authHeader = `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`;

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: twilioTo,
          Body: messageBody
        })
      });
      const twilioData: any = await twilioRes.json();
      if (twilioRes.ok && twilioData.sid) {
        console.log(`[WhatsApp Twilio Success] Dispatched to ${phone}, SID: ${twilioData.sid}`);
        return { sent: true, provider: 'Twilio WhatsApp', details: `SID: ${twilioData.sid}`, directLink };
      } else {
        console.warn('[WhatsApp Twilio Response Warning]', twilioData);
      }
    } catch (e: any) {
      console.warn('[WhatsApp Twilio Exception]', e?.message);
    }
  }

  // 3. Check Meta / WhatsApp Cloud API
  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
  if (metaToken && metaPhoneId) {
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v18.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: digitsOnly,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody
          }
        })
      });
      const metaData: any = await metaRes.json();
      if (metaRes.ok && metaData.messages && metaData.messages[0]?.id) {
        console.log(`[WhatsApp Meta Cloud API Success] Dispatched to ${phone}, ID: ${metaData.messages[0].id}`);
        return { sent: true, provider: 'Meta WhatsApp Cloud API', details: `Msg ID: ${metaData.messages[0].id}`, directLink };
      } else {
        console.warn('[WhatsApp Meta Cloud API Response Warning]', metaData);
      }
    } catch (e: any) {
      console.warn('[WhatsApp Meta Cloud API Exception]', e?.message);
    }
  }

  // 4. Check GreenAPI Provider
  const greenInstance = process.env.GREENAPI_INSTANCE_ID;
  const greenToken = process.env.GREENAPI_API_TOKEN;
  if (greenInstance && greenToken) {
    try {
      const greenRes = await fetch(`https://api.green-api.com/waInstance${greenInstance}/sendMessage/${greenToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${digitsOnly}@c.us`,
          message: messageBody
        })
      });
      const greenData: any = await greenRes.json();
      if (greenRes.ok && greenData.idMessage) {
        console.log(`[WhatsApp GreenAPI Success] Dispatched to ${phone}, ID: ${greenData.idMessage}`);
        return { sent: true, provider: 'GreenAPI', details: `ID: ${greenData.idMessage}`, directLink };
      }
    } catch (e: any) {
      console.warn('[WhatsApp GreenAPI Exception]', e?.message);
    }
  }

  // 5. Check Supabase Edge Function
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
  const supabaseKey = cleanEnvKey(rawSupabaseKey);
  if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
    try {
      const edgeRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phone,
          digitsOnly,
          code,
          userType,
          message: messageBody
        })
      });
      if (edgeRes.ok) {
        const edgeData: any = await edgeRes.json();
        console.log(`[WhatsApp Supabase Edge Function Success] Dispatched to ${phone}`);
        return { sent: true, provider: 'Supabase Edge Function', details: edgeData?.message || 'Edge function dispatched', directLink };
      }
    } catch (e: any) {
      console.warn('[Supabase Edge Function Notice]', e?.message);
    }
  }

  // 6. Check Generic WhatsApp Webhook Gateway
  const customGateway = process.env.WHATSAPP_GATEWAY_URL;
  const customKey = process.env.WHATSAPP_GATEWAY_API_KEY;
  if (customGateway && isValidUrl(customGateway)) {
    try {
      const gwRes = await fetch(customGateway, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'Authorization': `Bearer ${customKey}`, 'x-api-key': customKey } : {})
        },
        body: JSON.stringify({
          phone,
          to: digitsOnly,
          code,
          message: messageBody,
          userType
        })
      });
      if (gwRes.ok) {
        return { sent: true, provider: 'Custom WhatsApp Gateway', details: 'Webhook executed', directLink };
      }
    } catch (e: any) {
      console.warn('[Custom WhatsApp Gateway Notice]', e?.message);
    }
  }

  return {
    sent: false,
    provider: 'Supabase DB & Direct WhatsApp Dispatch',
    details: `Live 6-digit OTP generated for ${phone}. Direct one-tap WhatsApp link available.`,
    directLink
  };
}

const whatsappOtpSessions = new Map<string, { code: string; expiresAt: number; status: 'pending' | 'verified'; userType: string }>();

app.post('/api/auth/whatsapp-otp/send', async (req, res) => {
  try {
    const { phone, code, userType, expiresAt, countryCode } = req.body || {};
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ ok: false, error: 'Phone number is required.' });
    }
    const cleanPhone = normalizeServerPhone(phone, countryCode);
    const otpCode = code || Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 10 * 60 * 1000;

    whatsappOtpSessions.set(cleanPhone, {
      code: otpCode,
      expiresAt: expiryTime,
      status: 'pending',
      userType: userType || 'customer'
    });

    // Attempt to sync with Supabase REST API if configured
    const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
    const supabaseKey = cleanEnvKey(rawSupabaseKey);

    if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            phone: cleanPhone,
            code: otpCode,
            status: 'pending',
            user_type: userType || 'customer',
            expires_at: new Date(expiryTime).toISOString()
          })
        });
      } catch (sbErr) {
        console.warn('Supabase REST sync warning:', sbErr);
      }
    }

    // Call live multi-provider WhatsApp dispatch
    const dispatchResult = await dispatchLiveWhatsAppMessage(cleanPhone, otpCode, userType || 'customer');

    console.log(`[WhatsApp OTP Dispatch] Phone: ${cleanPhone} | Provider: ${dispatchResult.provider} | Sent: ${dispatchResult.sent} | Code: ${otpCode}`);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      ok: true,
      phone: cleanPhone,
      codePreview: otpCode,
      provider: dispatchResult.provider,
      sent: dispatchResult.sent,
      details: dispatchResult.details,
      directLink: dispatchResult.directLink,
      expiresAt: new Date(expiryTime).toISOString(),
      message: dispatchResult.sent
        ? `WhatsApp OTP sent successfully to ${cleanPhone} via ${dispatchResult.provider}.`
        : `WhatsApp OTP generated for ${cleanPhone}. Please check WhatsApp or use the test code.`
    });
  } catch (err: any) {
    console.error('WhatsApp OTP send endpoint error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Internal server error sending WhatsApp OTP' });
  }
});

app.post('/api/auth/whatsapp-otp/verify', async (req, res) => {
  try {
    const { phone, code, countryCode } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ ok: false, error: 'Phone and 6-digit OTP code are required.' });
    }
    const cleanPhone = normalizeServerPhone(String(phone), countryCode);
    const rawPhoneDigits = String(phone).trim().replace(/[^\d+]/g, '');
    const cleanCode = String(code).trim();

    const session = whatsappOtpSessions.get(cleanPhone) || whatsappOtpSessions.get(rawPhoneDigits);

    // Also check Supabase if session in memory expired/missing
    let isValidInSupabase = false;
    const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseUrl = cleanEnvUrl(rawSupabaseUrl);
    const supabaseKey = cleanEnvKey(rawSupabaseKey);

    if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
      try {
        const sbRes = await fetch(`${supabaseUrl}/rest/v1/whatsapp_otps?phone=in.(${encodeURIComponent(cleanPhone)},${encodeURIComponent(rawPhoneDigits)})&status=eq.pending&select=*&order=created_at.desc&limit=1`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (sbRes.ok) {
          const rows = await sbRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            if (row.code === cleanCode && new Date(row.expires_at).getTime() > Date.now()) {
              isValidInSupabase = true;
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase verification lookup warning:', sbErr);
      }
    }

    if (session && session.code === cleanCode && session.expiresAt > Date.now()) {
      session.status = 'verified';
      whatsappOtpSessions.set(cleanPhone, session);
      return res.status(200).json({
        ok: true,
        verified: true,
        message: 'Phone number verified successfully via WhatsApp!',
        token: `wp_verified_${Date.now()}`
      });
    }

    if (isValidInSupabase) {
      return res.status(200).json({
        ok: true,
        verified: true,
        message: 'Phone number verified successfully via Supabase!',
        token: `sb_verified_${Date.now()}`
      });
    }

    return res.status(400).json({
      ok: false,
      verified: false,
      error: 'Invalid or expired WhatsApp OTP code. Please check your WhatsApp app and try again.'
    });
  } catch (err: any) {
    console.error('WhatsApp OTP verify endpoint error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error verifying WhatsApp OTP' });
  }
});

// Fallback for any unhandled /api/* request so it returns JSON and NOT HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ ok: false, error: `API route ${req.method} ${req.path} not found` });
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

export default app;
