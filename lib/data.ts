// lib/data.ts
import { supabase } from './supabase'
import type { Card } from './types'

export async function getCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select(`
      *,
      category:categories (
        id,
        name,
        color
      )
    `)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Failed to fetch cards:', error.message)
    return []
  }

  return (data as Card[]) ?? []
}