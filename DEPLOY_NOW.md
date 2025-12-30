# Quick Vercel Deployment Guide

## Option 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Go to Vercel
1. Visit https://vercel.com/new
2. Sign in with your GitHub account (or create an account)

### Step 2: Import Your Repository
1. Click **"Import Git Repository"**
2. Find and select: `khateebmoe01/rillation-sb-react`
3. Click **"Import"**

### Step 3: Configure Project Settings
Vercel should auto-detect these settings (verify they match):
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Root Directory:** `./` (leave as is)

### Step 4: Add Environment Variables (CRITICAL!)
**BEFORE clicking Deploy**, add these environment variables:

1. Click on **"Environment Variables"** section
2. Add the following:

   | Variable Name | Value |
   |--------------|-------|
   | `VITE_SUPABASE_URL` | `https://pfxgcavxdktxooiqthoi.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (get from https://app.supabase.com/project/pfxgcavxdktxooiqthoi/settings/api) |

3. Make sure to select **"All Environments"** (Production, Preview, Development)

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Your app will be live at: `https://rillation-sb-react.vercel.app` (or similar)

---

## Option 2: Deploy via Vercel CLI

If you prefer using the CLI, run these commands in your terminal:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow the prompts)
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## After Deployment

1. **Test your deployment:**
   - Visit the deployment URL
   - Check that all pages load correctly
   - Verify Supabase connection works

2. **Set up automatic deployments:**
   - Any push to `main` branch will automatically deploy
   - Preview deployments are created for pull requests

3. **Monitor your deployment:**
   - Go to your Vercel dashboard
   - Check the "Deployments" tab for build logs

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Make sure TypeScript compiles: `npm run build` (locally)

### App Loads But Shows Errors
- Check browser console for errors
- Verify environment variables are set correctly
- Go to: Project Settings → Environment Variables

### Supabase Connection Errors
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is the **anon/public** key (not service_role)
- Check Supabase RLS policies if data doesn't load

---

## Quick Links

- **GitHub Repo:** https://github.com/khateebmoe01/rillation-sb-react
- **Supabase Dashboard:** https://app.supabase.com/project/pfxgcavxdktxooiqthoi
- **Vercel Dashboard:** https://vercel.com/dashboard


