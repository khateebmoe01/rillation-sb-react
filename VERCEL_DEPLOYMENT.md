# Vercel Deployment Guide

## Prerequisites
- GitHub repository: https://github.com/khateebmoe01/rillation-sb-react
- Vercel account (sign up at https://vercel.com if you don't have one)
- Supabase project credentials

## Step-by-Step Deployment Instructions

### 1. Get Your Supabase Credentials

Before deploying, get your Supabase credentials:

1. Go to https://app.supabase.com/project/pfxgcavxdktxooiqthoi/settings/api
2. Copy the following values:
   - **Project URL** (e.g., `https://pfxgcavxdktxooiqthoi.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

Keep these values ready - you'll need them in step 3.

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. If not already connected, click **"Import Git Repository"** → **"GitHub"**
4. Authorize Vercel to access your GitHub account
5. Find and select: `khateebmoe01/rillation-sb-react`
6. Click **"Import"**

### 3. Configure Environment Variables

**IMPORTANT:** Before clicking "Deploy", add these environment variables:

1. In the deployment configuration screen, find **"Environment Variables"** section
2. Add the following variables:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://pfxgcavxdktxooiqthoi.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Your anon key from Supabase dashboard |

3. Make sure **"All Environments"** (Production, Preview, Development) is selected

### 4. Verify Build Settings

The following should be auto-detected (verify they match):

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Root Directory:** `./` (leave as is)

### 5. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a URL like: `https://rillation-sb-react.vercel.app`

### 6. Verify Deployment

1. Click on the deployment URL
2. Check that the app loads correctly
3. Verify Supabase connection by checking if data loads
4. Test navigation between pages:
   - Quick View
   - Pipeline View
   - Deep View
   - Infrastructure

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Make sure TypeScript compiles locally: `npm run build`

### App Loads But Shows Errors
- Check browser console for errors
- Verify environment variables are set correctly in Vercel dashboard
- Go to: Project Settings → Environment Variables

### Supabase Connection Errors
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is the **anon/public** key (not service_role)
- Check Supabase RLS policies if data doesn't load

## Re-deploying

Any push to the `main` branch will automatically trigger a new deployment on Vercel.

To manually redeploy:
1. Go to your Vercel project dashboard
2. Click **"Deployments"** tab
3. Click on any deployment and select **"Redeploy"**

## Custom Domain (Optional)

To add a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed by Vercel

---

## Quick Reference

**Project URL:** https://github.com/khateebmoe01/rillation-sb-react  
**Supabase Project:** pfxgcavxdktxooiqthoi  
**Supabase Dashboard:** https://app.supabase.com/project/pfxgcavxdktxooiqthoi  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Framework:** Vite + React + TypeScript











