// app/page.tsx
// Dynamic server component — re-fetches from Supabase on every request.
// No caching, so changes in the database appear immediately on reload.

import { getCards } from '@/lib/data'
import BusinessCard from '@/components/BusinessCard'

// Force dynamic rendering (no static generation or ISR)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const cards = await getCards()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Contact Cards
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {cards.length} {cards.length === 1 ? 'contact' : 'contacts'} · sorted A–Z
            </p>
          </div>
        </div>
      </header>

      {/* ── Grid ── */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <p className="text-gray-400 text-sm">No contacts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {cards.map(card => (
              <BusinessCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}