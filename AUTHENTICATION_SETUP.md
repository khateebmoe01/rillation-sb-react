# Authentication Setup Guide

This guide will walk you through setting up email/password authentication in your Supabase project.

## Quick Start (5 minutes)

1. ✅ Enable Email auth in Supabase Dashboard → Authentication → Providers
2. ✅ Create a test user in Supabase Dashboard → Authentication → Users
3. ✅ Apply RLS policies (run the migration SQL in Supabase SQL Editor)
4. ✅ Test login at `http://localhost:5173`

## Prerequisites

- Access to your Supabase project dashboard
- Your Supabase project URL and anon key (already configured in `.env`)

## Step 1: Enable Email/Password Authentication in Supabase

1. **Go to your Supabase Dashboard**
   - Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to Authentication Settings**
   - In the left sidebar, click **Authentication**
   - Click on **Providers** (or go to Settings → Auth)

3. **Enable Email Provider**
   - Find **Email** in the list of providers
   - Toggle it **ON** (it should be enabled by default)
   - Make sure **"Enable email confirmations"** is set according to your preference:
     - **ON**: Users must verify their email before signing in (more secure)
     - **OFF**: Users can sign in immediately after signup (easier for testing)

4. **Configure Email Settings (Optional)**
   - Under **Email Templates**, you can customize the confirmation and password reset emails
   - For development, you can use Supabase's default templates

## Step 2: Create User Accounts

You have two options to create user accounts:

### Option A: Create Users via Supabase Dashboard (Recommended for Testing)

1. **Go to Authentication → Users**
   - In your Supabase dashboard, navigate to **Authentication** → **Users**

2. **Add a New User**
   - Click the **"Add user"** or **"Invite user"** button
   - Enter:
     - **Email**: `user@example.com` (use a real email you can access)
     - **Password**: Choose a secure password
     - **Auto Confirm User**: ✅ Check this box (so you don't need email verification)
   - Click **"Create user"**

3. **Note the Credentials**
   - Save the email and password you created - you'll use these to test login

### Option B: Create Users via Sign Up (If you add a signup page)

If you want users to sign up themselves, you can add a signup function to your app. For now, we'll use Option A.

## Step 3: Configure Row Level Security (RLS) Policies

Your database tables need RLS policies to allow authenticated users to access data. We've created a migration file for this.

### Option A: Apply Migration via Supabase CLI (Recommended)

If you have Supabase CLI set up:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### Option B: Apply Migration via Supabase Dashboard

1. **Go to SQL Editor**
   - In Supabase dashboard, navigate to **SQL Editor**

2. **Open the Migration File**
   - Open the file: `supabase/migrations/20250110000000_setup_auth_policies.sql`
   - Copy all the SQL content

3. **Run the SQL**
   - Paste the SQL into the SQL Editor
   - Click **"Run"** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
   - Verify that all policies were created successfully

### Option C: Manual Policy Setup

If you prefer to set up policies manually:

1. **Go to Database → Policies**
   - In Supabase dashboard, navigate to **Database** → **Policies**

2. **Enable RLS on Tables**
   - For each table, enable Row Level Security
   - Or run: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

3. **Create Policies**
   - For each table, create a policy allowing authenticated users to read/insert/update
   - The migration file (`supabase/migrations/20250110000000_setup_auth_policies.sql`) contains all the necessary policies

**Note**: The migration sets up policies that allow ALL authenticated users to access ALL data. For production, you may want to restrict access based on user roles or client associations.

## Step 4: Test the Login Flow

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Navigate to the Login Page**
   - Open your browser to `http://localhost:5173`
   - You should be automatically redirected to `/login`

3. **Sign In**
   - Enter the email and password you created in Step 2
   - Click **"Sign In"**
   - You should be redirected to `/performance` (the dashboard)

4. **Verify Authentication**
   - You should see the dashboard with all your data
   - Check the browser console for any errors
   - Try navigating to different pages - they should all be accessible

5. **Test Sign Out**
   - Click the **"Sign Out"** button in the sidebar
   - You should be redirected back to `/login`

## Step 5: Verify Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these in:
- **Supabase Dashboard** → **Settings** → **API**
- Copy the **Project URL** and **anon/public** key

## Troubleshooting

### "Invalid login credentials"
- Double-check the email and password
- Make sure the user exists in Supabase (check Authentication → Users)
- Verify the user is confirmed (if email confirmation is enabled)

### "User not authenticated" or data not loading
- Check RLS policies on your database tables
- Verify your Supabase URL and anon key in `.env`
- Check browser console for specific error messages

### Redirect loop between login and dashboard
- Clear browser cookies/localStorage
- Check that the AuthContext is properly initialized
- Verify the ProtectedRoute component is working correctly

### Email confirmation required
- If you enabled email confirmations, check the user's email inbox
- Or disable email confirmations in Supabase settings for testing
- Or manually confirm the user in Supabase dashboard (Authentication → Users → click user → "Confirm user")

## Next Steps

Once authentication is working:

1. **Add User Management** (optional)
   - Create an admin page to manage users
   - Add role-based access control
   - Implement password reset functionality

2. **Enhance Security**
   - Set up proper RLS policies based on your data access requirements
   - Consider adding user roles and permissions
   - Implement session timeout

3. **Add Sign Up Page** (optional)
   - Create a signup page for new users
   - Add email verification flow
   - Implement password strength requirements

## Quick Reference: Supabase Dashboard Links

- **Authentication Settings**: `https://supabase.com/dashboard/project/[your-project]/auth/providers`
- **Users Management**: `https://supabase.com/dashboard/project/[your-project]/auth/users`
- **Database Policies**: `https://supabase.com/dashboard/project/[your-project]/auth/policies`
- **SQL Editor**: `https://supabase.com/dashboard/project/[your-project]/sql/new`
- **API Settings**: `https://supabase.com/dashboard/project/[your-project]/settings/api`

## Summary Checklist

- [ ] Email/Password authentication enabled in Supabase
- [ ] At least one test user created
- [ ] RLS policies applied to all tables
- [ ] Login page accessible at `/login`
- [ ] Can sign in with test credentials
- [ ] Can access dashboard after login
- [ ] Sign out button works

Once all items are checked, your authentication is fully set up! 🎉
