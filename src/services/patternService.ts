import { supabase } from '@/lib/supabase'
import { Pattern } from '@/types'

export const patternService = {
  async savePattern(pattern: Pattern, userId: string) {
    const { data, error } = await supabase
      .from('patterns')
      .insert([
        {
          user_id: userId,
          name: pattern.name || 'Untitled Pattern',
          bpm: pattern.bpm,
          steps: pattern.steps,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePattern(id: string, pattern: Partial<Pattern>, userId: string) {
    const { data, error } = await supabase
      .from('patterns')
      .update({
        name: pattern.name,
        bpm: pattern.bpm,
        steps: pattern.steps
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getPatterns(userId: string) {
    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPublicPatterns() {
    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async deletePattern(patternId: string) {
    const { error } = await supabase
      .from('patterns')
      .delete()
      .eq('id', patternId)

    if (error) throw error
  }
} 