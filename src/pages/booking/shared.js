// Shared bits for the class credits + booking feature (see booking-schema.sql).

export const ACCENT = '#c17c4a'
export const CARD_BG = '#ffffff'
export const LIGHT = '#f8f5f2'
export const TEXT = '#1a1a1a'
export const MUTED = '#7a6a5a'
export const OLIVE = '#8d9a55'
export const SLATE = '#6f8fa3'
export const DANGER = '#d94f4f'

export const WHATSAPP_LINK = 'https://wa.me/message/MJKP3BDCOIY6E1'
export const CANCEL_NOTICE_HOURS = 12
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const card = { background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }
export const addBtn = { padding: '9px 18px', borderRadius: 10, border: 'none', background: ACCENT, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
export const cancelBtn = { padding: '9px 18px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
export const smallBtn = { padding: '5px 12px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
export const input = { padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.15)', fontSize: 13, color: TEXT, background: 'white', boxSizing: 'border-box' }

export const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  return `${formatDay(iso)} · ${formatTime(iso)}`
}

// Local calendar date as YYYY-MM-DD (toISOString would shift to UTC)
export function localDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Credits a student can still spend: unexpired grants with something left.
export function usableGrants(grants) {
  const now = new Date()
  return grants.filter(g => g.remaining > 0 && (!g.expires_at || new Date(g.expires_at) > now))
}

export function expiryLabel(g) {
  if (!g.expires_at) return 'no expiry'
  // expires_at is the first instant of the next month; show the last valid day
  const lastDay = new Date(new Date(g.expires_at).getTime() - 1)
  return `use by ${lastDay.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

// Supabase RPC errors carry the RAISE EXCEPTION text in .message
export function errorText(error) {
  return error?.message || 'Something went wrong — please try again.'
}
