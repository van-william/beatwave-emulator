import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      beats: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          pattern: string
          bpm: number
          is_public: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          name: string
          pattern: string
          bpm: number
          is_public?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          name?: string
          pattern?: string
          bpm?: number
          is_public?: boolean
        }
      }
    }
  }
} 