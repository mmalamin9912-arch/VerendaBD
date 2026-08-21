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

// Subscription API
app.get('/api/subscription/by-store/:storeName', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });
  const { data, error } = await supabaseAdmin.from('merchants').select('subscription_plan, subscription_expiry').eq('storeName', req.params.storeName).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/subscription/update', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });
  const { storeName, planId, expiryDate } = req.body;
  const { data, error } = await supabaseAdmin.from('merchants').update({
    subscription_plan: planId,
    subscription_expiry: expiryDate
  }).eq('storeName', storeName);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Product API
app.get('/api/products/:merchantId', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });
  const { data, error } = await supabaseAdmin.from('products').select('*').eq('merchantId', req.params.merchantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/products', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });
  const { data, error } = await supabaseAdmin.from('products').upsert(req.body);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/products/:id', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin not configured' });
  const { error } = await supabaseAdmin.from('products').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
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
      console.log('Gemini API key missing. Falling back to mock description.');
      return res.json({ text: `[Mock Description] This is a high-quality product description generated for: ${prompt.substring(0, 100)}. Our product is crafted with care and designed to offer the best experience. Highlights include premium materials, ergonomic design, and long-lasting durability, ensuring customer satisfaction.` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction || "You are a professional e-commerce assistant.",
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('AI Text Generation Error:', error);
    // Fallback to mock on error as well
    res.json({ text: `[Mock Description] This is a high-quality product description generated for your product. Our product is crafted with care and designed to offer the best experience. Highlights include premium materials, ergonomic design, and long-lasting durability, ensuring customer satisfaction.` });
  }
});

app.post('/api/ai/copilot-support', async (req, res) => {
  try {
    const { query } = req.body;
    const prompt = `You are Zid AI, a helpful Store Manager assistant for an e-commerce platform. 
    Auto-detect the language of the query. If the query is written in Bangla script or Banglish, you MUST reply entirely in natural Bangla script. If it is in English, reply in English.
    Knowledge base: We support custom domains (settings -> domains), payment gateways (settings -> payments), product uploads (products -> add), order management (orders tab), and shipping configuration (logistics tab).
    Query: ${query}`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
