// lib/types.ts

export interface Category {
  id:    string
  name:  string
  color: string   // Tailwind class e.g. "bg-blue-500"
}

export interface Card {
  id:          string
  category_id: string | null
  full_name:   string
  title:       string | null
  company:     string | null
  email:       string | null
  phone:       string | null
  website:     string | null
  notes:       string | null
  created_at:  string
  updated_at:  string
  category:    Category | null
}