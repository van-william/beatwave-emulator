# Supabase Authentication Implementation Guide

## Overview
This document outlines the implementation of Google Authentication using Supabase in the TR-808 Emulator project, along with best practices followed.

## Detailed Supabase Setup

### Initial Project Configuration
1. **Create a Supabase Project**:
   - Go to [https://supabase.com](https://supabase.com) and sign up/login
   - Click "New project"
   - Enter a name (e.g., "tr808-emulator")
   - Choose a secure database password
   - Select region closest to your users (e.g., "us-east-1")
   - Wait for setup to complete (~2 minutes)

2. **Project API Keys**:
   - From dashboard, navigate to Project Settings > API
   - Save both keys securely:
     - `anon public key`: Used for client-side authentication
     - `service_role key`: NEVER expose this; used only in secure server environments

3. **Database Configuration**:
   - Supabase automatically creates `auth` schema with user tables
   - Add custom schema for application data:

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

-- Create an index for faster queries
CREATE INDEX patterns_user_id_idx ON public.patterns(user_id);
CREATE INDEX patterns_is_public_idx ON public.patterns(is_public);
```

## Google OAuth Configuration

### 1. Create Google OAuth Credentials

1. **Access Google Cloud Console**:
   - Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**:
   - Navigate to "APIs & Services > Library"
   - Search for "Google Identity" and enable it

3. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services > OAuth consent screen"
   - Select "External" user type
   - Fill required fields:
     - App name: "TR-808 Emulator"
     - User support email: your email
     - Developer contact email: your email
   - Add scopes:
     - `./auth/userinfo.email`
     - `./auth/userinfo.profile`
   - Add test users (if using test mode)
   - Save and continue

4. **Create OAuth Credentials**:
   - Go to "APIs & Services > Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Name: "TR-808 Emulator Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `https://808-emulator.netlify.app` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://808-emulator.netlify.app/auth/callback` (for production)
     - `https://ygxmoghgxsurkfjykzzn.supabase.co/auth/v1/callback` (Supabase project URL)
   - Click "Create"
   - Save the generated Client ID and Client Secret

### 2. Configure Supabase Auth

1. **Add Google Provider**:
   - In Supabase dashboard, go to Authentication > Providers
   - Find Google and click "Enable"
   - Enter the OAuth credentials:
     - Client ID: from Google Cloud Console
     - Client Secret: from Google Cloud Console
   - Set Redirect URL: automatically filled with Supabase URL
   - Save changes

2. **Customize Auth Settings**:
   - Go to Authentication > Settings
   - Customize as needed:
     - Enable/disable email confirmations
     - Set password strength requirements
     - Configure SMTP for email functions
     - Set JWT expiry times
   - For our project:
     - Disable email confirmation (for simplicity)
     - Set site URL to: `https://808-emulator.netlify.app`
     - Allow signups: enabled
     - JWT expiry: 3600 (1 hour)

## Client Implementation (Detailed)

### Supabase Client Configuration

```typescript
// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

// Type-safe client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-application-name': 'tr808-emulator'
      }
    }
  }
)

// Handle auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth event: ${event}`)
  
  // Update local storage for persistence
  if (session) {
    localStorage.setItem('tr808:auth:token', session.access_token)
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('tr808:auth:token')
  }
})
```

### Detailed Type Definitions

```typescript
// src/types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patterns: {
        Row: {
          id: string
          user_id: string
          name: string
          bpm: number
          steps: Json
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          bpm: number
          steps: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          bpm?: number
          steps?: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
```

### Comprehensive Authentication Context

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Check for existing session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (err) {
        console.error('Error initializing auth:', err)
        setError(err as AuthError)
        toast.error('Authentication system initialization failed')
      } finally {
        setLoading(false)
      }
    }
    
    initializeAuth()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
      }
    )
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) throw error
    } catch (err) {
      console.error('Error signing in with Google:', err)
      setError(err as AuthError)
      toast.error('Failed to sign in with Google')
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
    } catch (err) {
      console.error('Error signing out:', err)
      setError(err as AuthError)
      toast.error('Failed to sign out')
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  // Refresh session
  const refreshSession = async (): Promise<void> => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      setSession(data.session)
      setUser(data.session?.user ?? null)
    } catch (err) {
      console.error('Error refreshing session:', err)
      setError(err as AuthError)
      toast.error('Session expired. Please sign in again.')
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signInWithGoogle,
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for using auth
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}
```

### Enhanced Login Button with States

```typescript
// src/components/LoginButton.tsx
import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { LogIn, LogOut, User as UserIcon } from 'lucide-react'

export const LoginButton: React.FC = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  
  // Handle login
  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      // Error handling done in context
      console.error('Login failed in component:', error)
    }
  }
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      // Error handling done in context
      console.error('Logout failed in component:', error)
    }
  }
  
  // Show loading state
  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <span className="ml-2">Loading...</span>
      </Button>
    )
  }
  
  // Show dropdown if logged in
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={user.user_metadata.avatar_url || ''}
                alt={user.user_metadata.full_name || 'User'}
              />
              <AvatarFallback>
                {(user.user_metadata.full_name || 'User')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline">{user.user_metadata.full_name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <div className="flex cursor-default flex-col space-y-1">
              <p className="text-xs font-medium">{user.user_metadata.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  
  // Show login button if not logged in
  return (
    <Button variant="outline" size="sm" onClick={handleLogin}>
      <LogIn className="mr-2 h-4 w-4" />
      <span>Sign in with Google</span>
    </Button>
  )
}
```

### OAuth Callback Handler

```typescript
// src/pages/AuthCallback.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get hash from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (!accessToken || !refreshToken) {
          // Check for error in URL
          const errorQuery = new URLSearchParams(window.location.search)
          const errorMsg = errorQuery.get('error_description')
          
          if (errorMsg) {
            throw new Error(errorMsg)
          } else {
            throw new Error('No tokens found in URL')
          }
        }
        
        // Exchange code for session
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        if (error) throw error
        
        // Get return URL from local storage or default to home
        const returnUrl = localStorage.getItem('auth:return-url') || '/'
        localStorage.removeItem('auth:return-url')
        
        // Redirect to previous page
        navigate(returnUrl, { replace: true })
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        
        // Redirect to home after 5 seconds on error
        setTimeout(() => {
          navigate('/')
        }, 5000)
      }
    }
    
    handleAuthCallback()
  }, [navigate])
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-lg bg-secondary p-8 shadow-lg">
        {error ? (
          <div className="text-center">
            <h1 className="text-xl font-bold text-destructive">Authentication Error</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4">Redirecting to home page...</p>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-bold">Completing Sign In</h1>
            <div className="mt-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
            <p className="mt-4">Please wait while we sign you in...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback
```

## Pattern Service Implementation

```typescript
// src/services/patternService.ts
import { supabase } from '@/lib/supabase'
import { Pattern, SavedPattern } from '@/types'
import { toast } from 'sonner'

export const patternService = {
  /**
   * Save a new pattern to Supabase
   */
  async savePattern(
    pattern: Pattern,
    userId: string,
    isPublic: boolean = false
  ): Promise<SavedPattern> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .insert([
          {
            user_id: userId,
            name: pattern.name || 'Untitled Pattern',
            bpm: pattern.bpm,
            steps: pattern.steps,
            is_public: isPublic,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select('*')
        .single()

      if (error) throw error
      return data as SavedPattern
    } catch (error) {
      console.error('Error saving pattern:', error)
      throw new Error('Failed to save pattern to database')
    }
  },

  /**
   * Update an existing pattern
   */
  async updatePattern(
    id: string,
    pattern: Partial<Pattern>,
    userId: string
  ): Promise<SavedPattern> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .update({
          name: pattern.name,
          bpm: pattern.bpm,
          steps: pattern.steps,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (error) throw error
      return data as SavedPattern
    } catch (error) {
      console.error('Error updating pattern:', error)
      throw new Error('Failed to update pattern in database')
    }
  },

  /**
   * Get all patterns for a user
   */
  async getPatterns(userId: string): Promise<SavedPattern[]> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as SavedPattern[]
    } catch (error) {
      console.error('Error fetching patterns:', error)
      throw new Error('Failed to load patterns from database')
    }
  },

  /**
   * Get public patterns from all users
   */
  async getPublicPatterns(limit = 20): Promise<SavedPattern[]> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as SavedPattern[]
    } catch (error) {
      console.error('Error fetching public patterns:', error)
      throw new Error('Failed to load public patterns from database')
    }
  },

  /**
   * Delete a pattern
   */
  async deletePattern(patternId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('patterns')
        .delete()
        .eq('id', patternId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting pattern:', error)
      throw new Error('Failed to delete pattern from database')
    }
  },
  
  /**
   * Get a single pattern by ID
   */
  async getPatternById(patternId: string): Promise<SavedPattern> {
    try {
      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('id', patternId)
        .single()

      if (error) throw error
      return data as SavedPattern
    } catch (error) {
      console.error('Error fetching pattern:', error)
      throw new Error('Failed to load pattern from database')
    }
  }
}
```

## Security Best Practices

### 1. Row-Level Security (RLS)

Supabase uses PostgreSQL's Row-Level Security to protect data, ensuring users can only access what they're authorized to see.

Example RLS policies:

```sql
-- Only let users read their own data
CREATE POLICY "Users can only read their own patterns" ON patterns
FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own patterns
CREATE POLICY "Users can only update their own patterns" ON patterns
FOR UPDATE USING (auth.uid() = user_id);
```

### 2. JWT Validation and Management

- JWT tokens are automatically managed by Supabase client
- Set appropriate token expiry (e.g., 1 hour for access tokens, 24 hours for refresh tokens)
- Implement secure token refresh workflows

### 3. HTTPS Everywhere

- All communication with Supabase is over HTTPS
- Set up CSP headers in your app to prevent XSS

### 4. Environment Variables

Never expose secrets in your client-side code:

```js
// .env.local
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

// Never include in client-side code:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Content Security Policy

```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  connect-src 'self' https://*.supabase.co https://apis.google.com;
  img-src 'self' https://lh3.googleusercontent.com data:;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
">
```

## Common Authentication Scenarios

### 1. Handling Session Expiry

```typescript
// Intercept API calls to handle token expiry
const apiCall = async () => {
  try {
    const response = await fetch('/api/data')
    return await response.json()
  } catch (error) {
    if (error.status === 401) {
      // Try to refresh the token
      const { error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        // Redirect to login if refresh fails
        toast.error('Your session has expired. Please sign in again.')
        navigate('/login')
        return null
      }
      
      // Retry the API call with new token
      return apiCall()
    }
    throw error
  }
}
```

### 2. Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: JSX.Element
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  if (loading) {
    return <div>Loading authentication...</div>
  }
  
  if (!user) {
    // Save the current location for redirect after login
    localStorage.setItem('auth:return-url', location.pathname)
    return <Navigate to="/login" replace />
  }
  
  return children
}
```

### 3. Real-time Database Updates

```typescript
// Listen for pattern changes in real-time
const listenToPatterns = (userId: string, onPatternChange: (patterns: SavedPattern[]) => void) => {
  const subscription = supabase
    .from('patterns')
    .on('*', (payload) => {
      // Fetch updated patterns when a change occurs
      patternService.getPatterns(userId).then(onPatternChange)
    })
    .subscribe()
  
  return () => {
    supabase.removeSubscription(subscription)
  }
}
```

## Testing Auth Flows

### 1. Mock Supabase Client for Tests

```typescript
// src/__mocks__/supabaseMock.ts
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png'
  }
}

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser
}

export const mockSupabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null
    }),
    signInWithOAuth: jest.fn().mockResolvedValue({
      data: {},
      error: null
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null
    }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { /* mock data */ },
      error: null
    }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockResolvedValue({
      error: null
    })
  })
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))
```

### 2. Auth Context Tests

```typescript
// src/__tests__/AuthContext.test.tsx
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { mockUser, mockSession } from '../__mocks__/supabaseMock'

// Test component that uses auth
const TestComponent = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {user ? (
        <>
          <div data-testid="user-email">{user.email}</div>
          <button onClick={signOut}>Sign Out</button>
        </>
      ) : (
        <button onClick={signInWithGoogle}>Sign In</button>
      )}
    </div>
  )
}

describe('AuthContext', () => {
  test('provides authentication state to components', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // After loading, should show user info
    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })
  
  test('handles sign out', async () => {
    const user = userEvent.setup()
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    
    // Wait for auth to initialize
    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })
    
    // Mock sign out response
    const supabase = require('@/lib/supabase').supabase
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null
    })
    
    // Click sign out button
    await user.click(screen.getByText('Sign Out'))
    
    // Should show sign in button after signing out
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })
})
```

## Deployment Considerations

### 1. Environment Variables for Different Environments

```
# .env.development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key

# .env.production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

### 2. CI/CD Pipeline Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Backup and Disaster Recovery

### 1. Database Backups

Supabase automatically performs daily backups of your database. For additional security:

1. **Export Data Regularly**: 
   ```sql
   COPY (SELECT * FROM patterns) TO '/tmp/patterns_backup.csv' WITH CSV HEADER;
   ```

2. **Create Custom Backup Functions**:
   ```sql
   CREATE OR REPLACE FUNCTION backup_patterns()
   RETURNS void AS $$
   BEGIN
     COPY (SELECT * FROM patterns) TO '/tmp/patterns_backup_' || to_char(now(), 'YYYY_MM_DD') || '.csv' WITH CSV HEADER;
   END;
   $$ LANGUAGE plpgsql;
   ```

### 2. Migration Scripts

Always maintain migration scripts for schema changes:

```sql
-- migrations/01_initial_schema.sql
CREATE TABLE public.patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- rest of schema
);

-- migrations/02_add_is_public_column.sql
ALTER TABLE public.patterns ADD COLUMN is_public BOOLEAN DEFAULT false;
```

## Monitoring and Analytics

### 1. Track Auth Events

```typescript
// Track authentication events
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      analytics.track('user_signed_in', {
        provider: session?.user?.app_metadata?.provider || 'unknown'
      })
      break
    case 'SIGNED_OUT':
      analytics.track('user_signed_out')
      break
    case 'TOKEN_REFRESHED':
      analytics.track('token_refreshed')
      break
    case 'USER_UPDATED':
      analytics.track('user_updated')
      break
  }
})
```

### 2. Performance Monitoring

```typescript
// Measure authentication performance
const measureAuthPerformance = async () => {
  const startTime = performance.now()
  
  try {
    await supabase.auth.getSession()
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    analytics.track('auth_performance', {
      operation: 'get_session',
      duration_ms: duration
    })
  } catch (error) {
    analytics.track('auth_error', {
      operation: 'get_session',
      error: error.message
    })
  }
}
```

## Future Improvements

### 1. Multi-Factor Authentication (MFA)

Supabase supports MFA through custom implementation:

```typescript
// Example MFA verification (conceptual)
const verifyMFA = async (token: string) => {
  const { data, error } = await supabase.functions.invoke('verify-mfa', {
    body: { token }
  })
  
  if (error) throw error
  return data.verified
}
```

### 2. Social Login Expansion

Add more OAuth providers:

```typescript
// GitHub login
const signInWithGitHub = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github'
  })
  
  if (error) throw error
}

// Twitter login
const signInWithTwitter = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter'
  })
  
  if (error) throw error
}
```

### 3. Advanced User Management

```typescript
// User profile management
const updateUserProfile = async (profile: { fullName: string, avatarUrl: string }) => {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl
    }
  })
  
  if (error) throw error
}

// Password reset flow
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  
  if (error) throw error
}
```

## Conclusion

This comprehensive integration of Supabase authentication with Google OAuth provides a secure, scalable, and user-friendly authentication system for the TR-808 Emulator. By following the best practices outlined in this document, the application maintains high security standards while offering a seamless user experience. 