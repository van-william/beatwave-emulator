import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Beat = Database['public']['Tables']['beats']['Row']
type NewBeat = Database['public']['Tables']['beats']['Insert']

export const beatService = {
  async createBeat(beat: NewBeat) {
    const { data, error } = await supabase
      .from('beats')
      .insert(beat)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getBeatsByUserId(userId: string) {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPublicBeats() {
    const { data, error } = await supabase
      .from('beats')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateBeat(id: string, updates: Partial<Beat>) {
    const { data, error } = await supabase
      .from('beats')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteBeat(id: string) {
    const { error } = await supabase
      .from('beats')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
} 