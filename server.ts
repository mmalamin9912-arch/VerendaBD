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
app.use(express.json());

const PORT = 3000;

// Initialize Supabase Admin for server-side persistence
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// In-memory fallback stores for local resilience
const inMemoryStore = {
  subscriptions: new Map<string, any>(),
  products: new Map<string, any[]>(),
  customers: new Map<string, any[]>(),
  orders: new Map<string, any[]>(),
};

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

// Product API
app.get('/api/products/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('products').select('*').eq('merchantId', merchantId);
      if (!error && data) return res.json(data);
    } catch (e) {
      console.warn('Supabase get products error:', e);
    }
  }
  const products = inMemoryStore.products.get(merchantId) || [];
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const payload = req.body;
  
  // Helper to sanitize a single product
  const sanitizeProduct = (p: any) => ({
    ...p,
    id: p.id || crypto.randomUUID(),
    merchantId: p.merchantId || 'default',
    title: p.title || 'Untitled Product',
    priceBDT: Number(p.priceBDT) || 0,
    stock: Number(p.stock) || 0,
    sku: p.sku || '',
    category: p.category || '',
    images: Array.isArray(p.images) ? p.images : [],
    descriptionEn: p.descriptionEn || '',
    descriptionBn: p.descriptionBn || ''
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
        console.error('Supabase save product error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data || sanitizedPayload);
    } catch (e) {
      console.error('Unexpected Supabase save product error:', e);
      return res.status(500).json({ error: 'Internal Server Error' });
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

// Customer API
app.get('/api/customers/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('customers').select('*').eq('merchantId', merchantId);
      if (!error && data) return res.json(data);
    } catch (e) {
      console.warn('Supabase get customers error:', e);
    }
  }
  res.json(inMemoryStore.customers.get(merchantId) || []);
});

app.post('/api/customers', async (req, res) => {
  const payload = req.body;
  const merchantId = Array.isArray(payload) ? (payload[0]?.merchantId || 'default') : (payload.merchantId || 'default');
  
  if (Array.isArray(payload)) {
    inMemoryStore.customers.set(merchantId, payload);
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('customers').upsert(payload);
      if (!error) return res.json(data || payload);
    } catch (e) {
      console.warn('Supabase save customers error:', e);
    }
  }
  res.json(payload);
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  inMemoryStore.customers.forEach((list, key) => {
    inMemoryStore.customers.set(key, list.filter(c => c.id !== id));
  });

  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('customers').delete().eq('id', id);
      if (!error) return res.json({ success: true });
    } catch (e) {
      console.warn('Supabase delete customer error:', e);
    }
  }
  res.json({ success: true });
});

// Order API
app.get('/api/orders/:merchantId', async (req, res) => {
  const { merchantId } = req.params;
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('orders').select('*').eq('merchantId', merchantId);
      if (!error && data) return res.json(data);
    } catch (e) {
      console.warn('Supabase get orders error:', e);
    }
  }
  res.json(inMemoryStore.orders.get(merchantId) || []);
});

app.post('/api/orders', async (req, res) => {
  const payload = req.body;
  const merchantId = Array.isArray(payload) ? (payload[0]?.merchantId || 'default') : (payload.merchantId || 'default');
  
  if (Array.isArray(payload)) {
    inMemoryStore.orders.set(merchantId, payload);
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('orders').upsert(payload);
      if (!error) return res.json(data || payload);
    } catch (e) {
      console.warn('Supabase save orders error:', e);
    }
  }
  res.json(payload);
});

// Gemini AI Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Endpoints
app.post('/api/ai/generate-text', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ text: `Crafted with superior materials and tailored precision, this product delivers exceptional durability, contemporary style, and peak performance for daily use. Designed to exceed expectations with flawless craftsmanship.` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a professional e-commerce copywriter. Provide concise, compelling product copy without generic filler.",
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('AI Text Generation Error:', error);
    res.json({ text: `Crafted with premium materials, this high-grade item offers exceptional comfort, modern aesthetics, and lasting reliability.` });
  }
});

app.post('/api/ai/suggest-pricing', async (req, res) => {
  try {
    const { productName, currentPrice, category } = req.body;
    const priceNum = Number(currentPrice) || 1000;

    if (!process.env.GEMINI_API_KEY) {
      const suggested = Math.round(priceNum * 0.9);
      const discount = Math.round(((priceNum - suggested) / priceNum) * 100);
      return res.json({
        suggestedPrice: suggested,
        discountPercentage: discount || 10,
        reasoning: `Optimized for ${category || 'general merchandise'} market demand to boost checkout conversion rates.`
      });
    }

    const prompt = `Analyze pricing for e-commerce product: "${productName}", Category: "${category}", Current Price: ৳${priceNum} BDT. Suggest an optimal competitive price, calculated discount percentage, and 1-sentence reasoning based on consumer demand in Bangladesh.
    Return JSON only in this exact format:
    {"suggestedPrice": number, "discountPercentage": number, "reasoning": "string"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      suggestedPrice: parsed.suggestedPrice || Math.round(priceNum * 0.9),
      discountPercentage: parsed.discountPercentage || 10,
      reasoning: parsed.reasoning || `Competitively positioned for high buyer conversion.`
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

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        faq: `### Frequently Asked Questions\n\n**Q: What is the delivery timeframe?**\nInside Dhaka 2-3 business days, outside Dhaka 3-5 days.\n\n**Q: How do returns work?**\nItems can be returned within 7 days in original condition.\n\n**Q: What payment options are supported?**\nbKash, Nagad, Cards, and Cash on Delivery (COD).`,
        chatbotScript: `Hello! Welcome to ${storeName || 'our store'}. How can I assist you today? You can ask about delivery, payments, or returns.`
      });
    }

    const prompt = `Based on these store policies for ${storeName || 'our store'}:
    ${JSON.stringify(policies)}
    
    1. Generate a structured Markdown FAQ with 4-5 key questions and answers.
    2. Generate an automated chatbot welcome script and quick answers.
    Return JSON in format: {"faq": "markdown string", "chatbotScript": "string"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      faq: parsed.faq || 'FAQ generated successfully.',
      chatbotScript: parsed.chatbotScript || 'Welcome to our store! How can I assist you today?'
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
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ summary: "Platform performance is stable with healthy transaction volume across active merchant stores. Conversion rates remain steady." });
    }

    const prompt = `Provide a concise 2-sentence executive summary for platform analytics: ${JSON.stringify(analyticsData)}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    res.json({ summary: response.text || 'Performance metrics are operating within normal parameters.' });
  } catch (error) {
    res.json({ summary: "Platform activity and revenue metrics are trending positively." });
  }
});

app.post('/api/ai/broadcast-email', async (req, res) => {
  try {
    const { topic, targetAudience } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        subject: `Exciting Platform Updates & Announcements`,
        message: `Dear Merchants,\n\nWe are pleased to announce new platform enhancements regarding ${topic}. Check your dashboard for more details.\n\nBest regards,\nPlatform Operations Team`
      });
    }

    const prompt = `Draft a professional broadcast email to ${targetAudience || 'merchants'} about topic: "${topic}".
    Return JSON format: {"subject": "string", "message": "string"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
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
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ reply: `Hello ${customerName || 'there'},\n\nThank you for reaching out. We have reviewed your request regarding "${ticketContent}" and our support team is actively resolving this. We will update you shortly.\n\nBest regards,\nCustomer Support Team` });
    }

    const prompt = `Write a polite, professional support resolution reply to ${customerName || 'customer'} regarding ticket: "${ticketContent}".`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    res.json({ reply: response.text || 'Thank you for reaching out. We are resolving your issue promptly.' });
  } catch (error) {
    res.json({ reply: `Hello ${req.body?.customerName || 'there'}, thank you for contacting support. We are looking into your request.` });
  }
});

app.post('/api/ai/copilot-support', async (req, res) => {
  try {
    const { query } = req.body;
    const prompt = `You are Zid AI, a helpful Store Manager assistant for an e-commerce platform. 
    Auto-detect the language of the query. If the query is written in Bangla script or Banglish, you MUST reply entirely in natural Bangla script. If it is in English, reply in English.
    Knowledge base: We support custom domains (settings -> domains), payment gateways (settings -> payments), product uploads (products -> add), order management (orders tab), and shipping configuration (logistics tab).
    Query: ${query}`;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ answer: "Zid AI Copilot: You can configure products in the Products tab, payment gateways in Settings -> Payments, and delivery in Logistics." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    res.json({ answer: response.text || '' });
  } catch (error) {
    console.error('AI Support Error:', error);
    res.status(500).json({ error: 'Failed to answer query.' });
  }
});

app.post('/api/ai/copilot-analytics', async (req, res) => {
  try {
    const { query, storeData } = req.body;
    const prompt = `You are a store data analyst. Analyze this store data to answer the query.
    Auto-detect the language of the query. If the query is written in Bangla script or Banglish, you MUST reply entirely in natural Bangla script. If it is in English, reply in English.
    Store Data: ${JSON.stringify(storeData)}
    Query: ${query}`;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ answer: "Store analytics indicate consistent visitor engagement and sales conversion." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    res.json({ answer: response.text || '' });
  } catch (error) {
    console.error('AI Analytics Error:', error);
    res.status(500).json({ error: 'Failed to analyze data.' });
  }
});

app.post('/api/ai/copilot-template', async (req, res) => {
  try {
    const { scenario } = req.body;
    const prompt = `Generate a polite customer support template for this scenario: ${scenario}`;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ template: `Dear customer, thank you for reaching out regarding ${scenario}. We are here to assist you.` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    res.json({ template: response.text || '' });
  } catch (error) {
    console.error('AI Template Error:', error);
    res.status(500).json({ error: 'Failed to generate template.' });
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
