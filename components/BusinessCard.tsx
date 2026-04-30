// components/BusinessCard.tsx
'use client'

import type { Card } from '@/lib/types'

const colorAccentMap: Record<string, string> = {
  'bg-blue-500':    '#3b82f6',
  'bg-emerald-500': '#10b981',
  'bg-rose-500':    '#f43f5e',
  'bg-amber-500':   '#f59e0b',
  'bg-purple-500':  '#a855f7',
  'bg-orange-500':  '#f97316',
  'bg-sky-500':     '#0ea5e9',
  'bg-pink-500':    '#ec4899',
  'bg-teal-500':    '#14b8a6',
  'bg-violet-500':  '#8b5cf6',
}

function getDiceBearUrl(seed: string) {
  const encoded = encodeURIComponent(seed)
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encoded}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

interface Props {
  card: Card
}

export default function BusinessCard({ card }: Props) {
  const accentColor = card.category
    ? (colorAccentMap[card.category.color] ?? '#6366f1')
    : '#6366f1'

  const avatarUrl = getDiceBearUrl(card.full_name)

  return (
    <article
      className="group relative bg-white rounded-2xl overflow-hidden cursor-default"
      style={{
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-6px) scale(1.02)'
        el.style.boxShadow = `0 20px 40px -8px ${accentColor}55, 0 8px 16px -4px rgba(0,0,0,0.12)`
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0) scale(1)'
        el.style.boxShadow = '0 2px 12px 0 rgba(0,0,0,0.07)'
      }}
    >
      {/* Accent stripe */}
      <div
        className="h-1.5 w-full"
        style={{ background: accentColor }}
      />

      <div className="p-6">
        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden"
            style={{
              outline: `2px solid ${accentColor}`,
              outlineOffset: '2px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={card.full_name}
              width={56}
              height={56}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 text-[15px] leading-tight truncate">
              {card.full_name}
            </h2>
            {card.title && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{card.title}</p>
            )}
          </div>
        </div>

        {/* Category badge */}
        {card.category && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full mb-4"
            style={{
              background: `${accentColor}18`,
              color: accentColor,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accentColor }}
            />
            {card.category.name}
          </span>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 mb-4" />

        {/* Contact details */}
        <ul className="space-y-2 text-[13px]">
          {card.company && (
            <li className="flex items-center gap-2 text-gray-700">
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l.75 18H3.75L4.5 3z" />
              </svg>
              <span className="truncate">{card.company}</span>
            </li>
          )}
          {card.email && (
            <li className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
              </svg>
              <a
                href={`mailto:${card.email}`}
                className="truncate transition-colors duration-200 hover:underline"
                style={{ color: accentColor }}
              >
                {card.email}
              </a>
            </li>
          )}
          {card.phone && (
            <li className="flex items-center gap-2 text-gray-700">
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z" />
              </svg>
              <span>{card.phone}</span>
            </li>
          )}
          {card.website && (
            <li className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
              </svg>
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate transition-colors duration-200 hover:underline"
                style={{ color: accentColor }}
              >
                {card.website.replace(/^https?:\/\//, '')}
              </a>
            </li>
          )}
        </ul>

        {/* Notes — slides in on hover */}
        {card.notes && (
          <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-20 opacity-0 group-hover:opacity-100">
            <p className="mt-4 pt-4 border-t border-gray-100 text-[12px] text-gray-500 leading-relaxed line-clamp-3">
              {card.notes}
            </p>
          </div>
        )}
      </div>
    </article>
  )
}