# Supabase Authentication Implementation Guide for TR-808 Emulator (Vite Project)

## Overview
This document provides a comprehensive guide to implementing Google Authentication using Supabase in the TR-808 Emulator Vite project, along with detailed best practices.

## Vite + Supabase Integration

### Vite Project Setup
Our project uses Vite rather than Next.js, which affects how we configure the environment, manage routing, and handle authentication:

1. **Project Initialization**:
   ```bash
   npm create vite@latest beatwave-emulator -- --template react-ts
   cd beatwave-emulator
   npm install
   ```

2. **Required Dependencies for Supabase Auth**:
   ```bash
   # Supabase core libraries
   npm install @supabase/supabase-js

   # Routing (we use React Router instead of Next.js routing)
   npm install react-router-dom

   # UI components and utilities
   npm install sonner # Toast notifications
   npm install lucide-react # Icons
   npm install tailwindcss # Styling
   ```

3. **Vite Environment Configuration**:
   Create `.env` files for different environments:

   ```plaintext
   # .env.local
   VITE_SUPABASE_URL=https://ygxmoghgxsurkfjykzzn.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   In Vite projects, environment variables must be prefixed with `VITE_` to be exposed to client code, and are accessed via `import.meta.env.VITE_*` instead of `process.env`.

4. **Vite Configuration**:
   ```typescript
   // vite.config.ts
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import path from 'path'

   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
     server: {
       port: 3000,
     },
   })
   ```

## Detailed Supabase Setup

### Initial Project Configuration
1. **Create a Supabase Project**:
   - Go to [https://supabase.com](https://supabase.com) and sign up/login
   - Click "New project"
   - Enter project name "beatwave-emulator"
   - Set a strong database password (stored in password manager)
   - Select region "us-east-1" (closest to most users)
   - The project initialization takes ~2 minutes to complete
   - Our actual project URL: `https://ygxmoghgxsurkfjykzzn.supabase.co`

2. **Project API Keys**:
   From the Supabase dashboard:
   - Navigate to Project Settings > API
   - Two key types are available:
     - `anon public key`: Used in our client-side authentication code
     - `service_role key`: NEVER exposed in client-side code, used for server operations only
   - We added these keys to our `.env.local` file and to Netlify environment variables

3. **Database Schema Design**:
   We created the following schema for storing TR-808 patterns:

```sql
-- Create patterns table for saving TR-808 patterns
CREATE TABLE public.patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  steps JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Row Level Security policies
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own patterns
CREATE POLICY "Users can insert their own patterns"
ON public.patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own patterns
CREATE POLICY "Users can update their own patterns"
ON public.patterns FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own patterns
CREATE POLICY "Users can delete their own patterns"
ON public.patterns FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Users can view their own patterns
CREATE POLICY "Users can view their own patterns"
ON public.patterns FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

-- Create indexes for performance
CREATE INDEX patterns_user_id_idx ON public.patterns(user_id);
CREATE INDEX patterns_is_public_idx ON public.patterns(is_public);
```

## Google OAuth Configuration (Step-by-Step)

### 1. Create Google Cloud Project

1. **Access Google Cloud Console**:
   - Went to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Created a new project named "TR-808 Emulator"
   - Project ID: `tr808-emulator-394522`

2. **Enable Google Identity API**:
   - Navigated to "APIs & Services > Library"
   - Searched for and enabled "Google Identity Services"
   - This API handles OAuth authentication flows

3. **Configure OAuth Consent Screen**:
   - Went to "APIs & Services > OAuth consent screen"
   - Selected "External" user type (allows any Google user to authenticate)
   - Filled required fields:
     - App name: "TR-808 Emulator"
     - User support email: (used personal email)
     - Developer contact information: (used personal email)
   - Added essential scopes only:
     - `./auth/userinfo.email` - For email address
     - `./auth/userinfo.profile` - For user's name and profile picture
   - For development, added test users (ourselves)
   - Published the app to make it available to all users

4. **Create OAuth Client ID**:
   - Went to "APIs & Services > Credentials"
   - Clicked "Create Credentials" > "OAuth client ID"
   - Selected "Web application" type
   - Named it "TR-808 Emulator Web Client"
   - Added Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://808-emulator.netlify.app` (for production)
   - Added Authorized redirect URIs:
     - `http://localhost:3000/auth/callback`
     - `https://808-emulator.netlify.app/auth/callback`
     - `https://ygxmoghgxsurkfjykzzn.supabase.co/auth/v1/callback`
   - Saved the generated credentials:
     - Client ID: `1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com` (example)
     - Client Secret: Stored securely (never in client code)

### 2. Supabase Auth Provider Configuration

1. **Add Google Auth Provider**:
   - In Supabase dashboard, went to Authentication > Providers
   - Enabled Google provider and entered:
     - Client ID from Google Cloud Console
     - Client Secret from Google Cloud Console
   - Confirmed the redirect URL matched our authorized redirect URIs

2. **Auth Settings Configuration**:
   - Went to Authentication > Settings
   - Made the following changes:
     - Disabled email confirmation (for UX simplicity)
     - Site URL: `https://808-emulator.netlify.app`
     - Redirect URLs: Added `https://808-emulator.netlify.app/auth/callback`
     - JWT expiry: Set to 3600 seconds (1 hour)
     - Enable signup: Enabled (allows new users)

### 3. Authentication Flow Diagram

Here's a detailed flow of how the authentication system works:

```
┌─────────────┐       ┌───────────────┐       ┌───────────────┐       ┌─────────────────┐       ┌─────────────┐
│             │       │               │       │               │       │                 │       │             │
│   User in   │ Click │ Supabase Auth │ Redirect │  Google OAuth  │ Consent │  Supabase Auth  │ Redirect │  TR-808 App  │
│  TR-808 App ├───────►  Client API   ├─────────►  Authorization ├─────────►  Callback URL   ├──────────►     with     │
│             │       │               │       │               │       │                 │       │  User Data  │
└─────────────┘       └───────────────┘       └───────────────┘       └─────────────────┘       └─────────────┘
```

## Client Implementation (Vite-Specific)

### 1. Supabase Client Configuration

The key difference in Vite projects is using `import.meta.env` for environment variables:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// Vite environment variables always use import.meta.env.VITE_* format
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Log auth events in development
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`Supabase auth event: ${event}`, session)
  })
}
```

### 2. Authentication Context Provider

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
        toast.error('Failed to restore your login session')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      toast.error('Failed to sign in with Google')
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithGoogle,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 3. Vite-specific Auth Callback Handling

This is how we handle the OAuth callback in a Vite + React Router environment:

```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Exchange the code for a session
    const handleRedirect = async () => {
      try {
        // Supabase automatically handles the exchange when the page loads
        // We just need to wait for the session to be established
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        if (data?.session) {
          // Successful login
          toast.success('Signed in successfully')
          
          // Redirect to origin or home page
          const returnTo = localStorage.getItem('returnTo') || '/'
          localStorage.removeItem('returnTo')
          navigate(returnTo, { replace: true })
        } else {
          // No session found
          toast.error('Authentication failed')
          navigate('/', { replace: true })
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Failed to complete authentication')
        navigate('/', { replace: true })
      }
    }

    handleRedirect()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-tr808-body">
      <div className="bg-tr808-black p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-tr808-orange text-2xl font-bold mb-4">Completing Sign In</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tr808-orange mx-auto mb-4"></div>
        <p className="text-tr808-cream">Please wait while we sign you in...</p>
      </div>
    </div>
  )
}

export default AuthCallback
```

### 4. App Router Setup (React Router for Vite)

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import Index from './pages/Index'
import AuthCallback from './pages/AuthCallback'
import NotFound from './pages/NotFound'
import { LoginButton } from './components/LoginButton'

const App = () => (
  <AuthProvider>
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <div className="ml-auto flex items-center space-x-4">
            <LoginButton />
          </div>
        </div>
      </header>
      
      <Toaster position="top-right" />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
  </AuthProvider>
)

export default App
```

## Google Auth Data Structure

When a user signs in with Google OAuth, we receive the following data structure:

```typescript
// Example user object structure from Google auth
{
  id: 'user-uuid-from-supabase',
  app_metadata: {
    provider: 'google',
    providers: ['google']
  },
  user_metadata: {
    avatar_url: 'https://lh3.googleusercontent.com/a/GoogleUserAvatar',
    email: 'user@gmail.com',
    email_verified: true,
    full_name: 'User Full Name',
    iss: 'https://accounts.google.com',
    name: 'User Full Name',
    picture: 'https://lh3.googleusercontent.com/a/GoogleUserAvatar',
    provider_id: 'google-oauth2|123456789',
    sub: '123456789'
  },
  aud: 'authenticated',
  email: 'user@gmail.com',
  phone: '',
  created_at: '2023-06-15T20:43:12.356Z',
  confirmed_at: '2023-06-15T20:43:12.362Z',
  last_sign_in_at: '2023-06-15T20:43:12.364Z',
  role: 'authenticated',
  updated_at: '2023-06-15T20:43:12.366Z'
}
```

## Pattern Service Implementation

This service manages saving and loading TR-808 patterns to Supabase:

```typescript
// src/services/patternService.ts
import { supabase } from '@/lib/supabase'
import { Pattern, SavedPattern } from '@/types'

export const patternService = {
  // Save a new pattern
  async savePattern(pattern: Pattern, userId: string, isPublic: boolean = false) {
    const { data, error } = await supabase
      .from('patterns')
      .insert([
        {
          user_id: userId,
          name: pattern.name || 'Untitled Pattern',
          bpm: pattern.bpm,
          steps: pattern.steps,
          is_public: isPublic,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all patterns for a user
  async getPatterns(userId: string) {
    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Delete a pattern
  async deletePattern(patternId: string) {
    const { error } = await supabase
      .from('patterns')
      .delete()
      .eq('id', patternId)

    if (error) throw error
  }
}
```

## Authentication Flow Analysis

### 1. Sign In Flow (Detailed)

When a user clicks "Sign in with Google" in our application, the following sequence occurs:

1. **Initial Sign-In Request**:
   ```typescript
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/callback` }
   })
   ```

2. **Browser Redirection**:
   - User is redirected to `https://ygxmoghgxsurkfjykzzn.supabase.co/auth/v1/authorize?provider=google`
   - Supabase adds necessary OAuth parameters
   - This happens in a single page navigation (no popup)

3. **Google OAuth Page**:
   - User sees Google's authentication page
   - User selects their Google account
   - Google validates the app's OAuth client ID
   - Google asks for consent to share profile info

4. **Post-Authentication Redirect**:
   - Google sends the user to Supabase's callback URL with an authorization code
   - Supabase exchanges this code for Google access/refresh tokens
   - Supabase creates or updates the user record in its auth.users table
   - Supabase creates a new session with JWT tokens

5. **Final Redirect to App**:
   - Browser is redirected to our app's callback URL: `https://808-emulator.netlify.app/auth/callback`
   - URL contains access and refresh tokens as hash parameters

6. **Session Establishment**:
   - Our callback handler extracts tokens
   - Supabase client stores them in localStorage
   - Auth context updates with user information
   - User is redirected to the original page they were on

### 2. Token Lifecycle Management

Our implementation handles JWT tokens effectively:

1. **Token Storage**:
   - Access token (short-lived, 1 hour)
   - Refresh token (longer-lived, 1 week)
   - Stored in browser's localStorage by Supabase client

2. **Automatic Refresh**:
   - Configured with `autoRefreshToken: true`
   - Supabase client monitors token expiry
   - Refreshes automatically before expiration
   - Prevents session interruption

3. **Session Recovery**:
   - On app load, we check for existing session
   - Restores user context if valid tokens exist
   - Handles page refreshes without requiring re-authentication

## Security Measures Implemented

### 1. Row-Level Security (RLS)

We implemented strict Row-Level Security policies to ensure data safety:

```sql
-- Example of our most important RLS policy
CREATE POLICY "Users can view their own patterns"
ON public.patterns FOR SELECT
USING (auth.uid() = user_id OR is_public = true);
```

This ensures:
- Users can only access their own patterns
- Patterns marked public are visible to all users
- Backend protection regardless of frontend code

### 2. Environment Variable Protection

We strictly followed these guidelines for environment variables:
- Supabase URL and anon key stored in `.env.local` (not committed to git)
- Used Vite's `import.meta.env.VITE_*` naming convention
- Added variables to Netlify deployment settings
- Never exposed service_role key in client code

### 3. HTTPS Enforcement

All communication with:
1. Our application (via Netlify)
2. Supabase API endpoints
3. Google OAuth endpoints

...happens exclusively over HTTPS with valid TLS certificates.

## Pattern Storage Implementation Details

Each TR-808 pattern is stored in Supabase with the following structure:

```typescript
interface SavedPattern {
  id: string;               // UUID from Supabase
  user_id: string;          // References auth.users(id)
  name: string;             // User-defined pattern name
  bpm: number;              // Beats per minute (20-300)
  steps: {                  // JSON structure of pattern
    [soundId: string]: {    // Each sound has its own steps
      id: number;           // Step position (0-15)
      active: boolean;      // Whether step is active
    }[];
  };
  is_public: boolean;       // Whether pattern is shared
  created_at: string;       // ISO timestamp
  updated_at: string;       // ISO timestamp
}
```

The step data is stored as a JSONB column, allowing flexible patterns while maintaining query capabilities.

## Deployment & CI/CD Integration

Our deployment process for the TR-808 Emulator Vite app with Supabase Auth:

1. **Environment Setup**:
   - Development: local Vite dev server with `.env.local`
   - Production: Netlify with environment variables

2. **Build Process**:
   - Netlify automatically builds on GitHub pushes
   - Build command: `npm run build`
   - Output directory: `dist/`

3. **Environment Variables in Netlify**:
   - Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Set proper redirect rules for SPA routing

4. **Redirect Configuration**:
   Created a `_redirects` file in `public/` folder:
   ```
   /* /index.html 200
   ```

5. **Google OAuth Configuration**:
   - Added production URL to authorized redirect URIs
   - Verified domain ownership for OAuth consent screen

## Detailed Implementation Decisions

### 1. Why We Chose Google Auth Only

We implemented only Google authentication because:

1. **User Convenience**: Most users already have Google accounts
2. **Profile Data**: Provides verified email, name, and profile photo
3. **Security**: Leverages Google's robust security infrastructure
4. **Implementation Simplicity**: Single auth provider simplifies UX
5. **Common Use Case**: Excellent fit for this side project

### 2. Private Patterns by Default

We made all patterns private by default for several reasons:

1. **Data Privacy**: Users might not want their beats shared automatically
2. **Reduced Cognitive Load**: Fewer decisions during pattern saving
3. **Future Expansion**: We can add sharing options later

### 3. Token-based Authentication vs. Cookie-based

We chose token-based auth because:

1. **SPA Architecture**: Works well with React SPA applications
2. **Cross-domain**: No CORS issues with separate frontend/backend
3. **Mobile Compatibility**: Same auth flow works on mobile apps
4. **Stateless**: No server-side session storage needed
5. **JWT Capabilities**: Can embed user claims in the token

## Performance Considerations

We optimized our authentication flow for performance:

1. **Lazy Loading**:
   - Auth components load only when needed
   - Reduces initial bundle size

2. **Parallel Loading**:
   - Application loads while auth state is being determined
   - Users see UI before authentication completes

3. **Caching Strategies**:
   - Pattern data is cached client-side
   - Reduces database reads after initial load

4. **Minimized Re-renders**:
   - Auth state changes are batched
   - Context is structured to prevent cascading renders

## Troubleshooting Guide

Common authentication issues and solutions:

1. **"Failed to sign in with Google"**:
   - Check Google API Console for errors
   - Verify OAuth consent screen configuration
   - Ensure redirect URIs match exactly
   - Check for Google account restrictions

2. **Session not persisting on refresh**:
   - Verify localStorage is accessible
   - Check for proper session handling in AuthContext
   - Debug token extraction in callback handler

3. **User data not loading after authentication**:
   - Check browser console for errors
   - Verify Supabase RLS policies
   - Inspect JWT token claims in dev tools

## Conclusion

This implementation of Supabase authentication with Google OAuth in our Vite-based TR-808 Emulator application provides a secure, scalable, and seamless user experience. By using Vite's specific environment configuration and React Router for navigation, we created a modern authentication system that maintains high security standards while offering a frictionless login experience.

The combination of Google's robust OAuth implementation and Supabase's flexible authentication API allowed us to create a powerful pattern saving system where users can securely store their TR-808 beats and access them from any device. 