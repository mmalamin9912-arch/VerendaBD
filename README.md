# Full-Stack React App

This project is configured to run both locally and be effortlessly deployed to **Vercel** with a Node.js backend.

## 🚀 Deploying to Vercel

The project comes pre-configured with a `vercel.json` file to route traffic to the Vite single-page application and the Express API serverless functions.

### 1. Import Project
1. Push your code to a GitHub repository.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
3. Import your GitHub repository.

### 2. Configure Environment Variables
During the Vercel import process, ensure you expand the **Environment Variables** section and add the following keys exactly as they appear in `.env.example`:

- `GEMINI_API_KEY`: Your Gemini API key for AI features.
- `MONGODB_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A secure random string for signing auth tokens (e.g., `my-super-secret-jwt-key`).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: If using Supabase.
- **SMTP_* Variables**: For email notifications (if configured).

### 3. Build & Deploy Settings
Vercel should automatically detect **Vite** and configure the build settings. If it doesn't, ensure they are set to:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Deploy!
Click **Deploy**. Vercel will build the frontend into `dist/` and automatically package `/api/index.ts` into a scalable Serverless Function.

## Local Development
Run `npm run dev` to start the frontend and backend simultaneously on port `3000`.
