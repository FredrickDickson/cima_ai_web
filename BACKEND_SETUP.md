# 🔧 Backend Setup Guide

You're getting authentication errors because the app is trying to connect to placeholder credentials. Here's how to fix it:

## Quick Fix: Use Demo Mode (Fastest - 2 minutes)

For testing the UI without backend, you can bypass authentication temporarily:

### Option A: Skip Login (Test UI Only)

1. Go to `http://localhost:5173/dashboard` directly in your browser
2. The app will redirect to login, but you can modify the auth check temporarily

### Option B: Mock Authentication (Better for Testing)

Update `src/contexts/AuthContext.tsx` to use mock data:

```tsx
// At the top of AuthContext.tsx, add this mock user
const MOCK_USER = {
  id: 'mock-user-123',
  email: 'demo@cima.ai',
  user_metadata: {}
};

const MOCK_PROFILE = {
  id: 'mock-user-123',
  full_name: 'Demo User',
  role: 'lawyer',
  avatar_url: null
};

// Then in the AuthProvider, replace the useEffect with:
useEffect(() => {
  // Mock authentication - comment out for real backend
  setUser(MOCK_USER as any);
  setProfile(MOCK_PROFILE as any);
  setLoading(false);
  
  // Uncomment below for real Supabase
  /*
  async function loadSession() {
    try {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadUserProfile(data.session.user.id);
      }
    } catch (error) {
      console.error("Session error:", error);
    } finally {
      setLoading(false);
    }
  }
  loadSession();

  const { data: authListener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
  */
}, []);
```

## Full Setup: Real Supabase Backend (15-30 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in:
   - Project Name: `cima-ai` (or any name)
   - Database Password: (generate a strong one - save it!)
   - Region: (choose closest to you)
6. Click "Create new project"
7. Wait 2-3 minutes for setup

### Step 2: Get Your Credentials

1. In your Supabase dashboard, click "Settings" (⚙️) in sidebar
2. Click "API" under Project Settings
3. Copy two things:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 3: Update .env File

Open your `.env` file and replace:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key

# You can leave Convex as placeholder for now
VITE_CONVEX_URL=https://placeholder.convex.cloud
```

### Step 4: Set Up Database Tables

1. In Supabase dashboard, go to "SQL Editor"
2. Click "New query"
3. Paste this SQL:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'lawyer',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'lawyer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. Click "Run" (or press Ctrl/Cmd + Enter)
5. Should see "Success. No rows returned"

### Step 5: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C in terminal)
npm run dev
```

### Step 6: Test It Out!

1. Go to `http://localhost:5173/`
2. Click "Get Started" or go to `/register`
3. Create an account with:
   - Email: `test@example.com`
   - Password: `TestPassword123!` (at least 6 characters)
   - Full Name: `Test User`
4. You should be logged in and redirected to dashboard!

## Troubleshooting

### Still Getting Errors?

**Error: "Invalid API key"**
- Double-check your `.env` file has the correct anon key
- Make sure there are no extra spaces
- Restart the dev server after changing `.env`

**Error: "Failed to fetch"**
- Check your internet connection
- Verify the Supabase URL is correct
- Make sure your Supabase project is active (not paused)

**Error: "Email already registered"**
- Use a different email
- Or go to Supabase > Authentication > Users and delete the test user

**Nothing works?**
- Use Mock Authentication (Option B above) to test the UI
- The mobile navigation will work perfectly without a backend!

## What Works Without Backend?

Even without real Supabase credentials, you can test:
- ✅ All UI components
- ✅ Mobile bottom navigation
- ✅ Mobile menu drawer
- ✅ Responsive design
- ✅ Animations and transitions
- ✅ Navigation between pages (routes)

You just can't:
- ❌ Actually log in/register
- ❌ Save data to database
- ❌ Persist user sessions

## Current Project Status

You have a **fully functional frontend** with premium Nordic Burgundy design:
- ✅ Desktop sidebar navigation
- ✅ Mobile bottom navbar (NEW!)
- ✅ Mobile menu drawer (NEW!)
- ✅ Premium top navbar with logo (NEW!)
- ✅ All pages styled and responsive
- ✅ Production-ready build

The mobile navigation is **already working** - you can test it right now by:
1. Opening DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select any mobile device
4. See your beautiful new mobile UI! 🎉

---

**Recommendation:** Use Mock Authentication (Option B) to test the mobile navigation immediately, then set up real Supabase later when you're ready to deploy.
