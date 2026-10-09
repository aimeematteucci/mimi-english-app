import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ACCENT, LIGHT, TEXT, MUTED, OLIVE, SLATE, DANGER, WHATSAPP_LINK, CANCEL_NOTICE_HOURS,
  card, addBtn, cancelBtn, smallBtn, userTimeZone,
  formatDay, formatTime, formatDateTime, localDateString, usableGrants, expiryLabel, errorText,
} from './shared'

const BOOKING_WINDOW_DAYS = 28

/* ── Student: credits + my classes + book a class ── */
export default function ClassesSection({ profile }) {
  const [grants, setGrants] = useState([])
  const [bookings, setBookings] = useState([])
  const [picking, setPicking] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: g }, { data: b }] = await Promise.all([
      supabase.from('credit_grant_balances').select('*').eq('student_id', profile.id),
      supabase.from('bookings').select('*').eq('student_id', profile.id).eq('status', 'booked')
        .gte('ends_at', new Date().toISOString()).order('starts_at'),
    ])
    setGrants(g || [])
    setBookings(b || [])
  }, [profile.id])

  useEffect(() => { fetchData() }, [fetchData])

  const usable = usableGrants(grants)
  const credits = usable.reduce((n, g) => n + g.remaining, 0)

  async function cancel(b) {
    const hoursLeft = (new Date(b.starts_at) - Date.now()) / 36e5
    const warning = hoursLeft >= CANCEL_NOTICE_HOURS
      ? 'Cancel this class? Your credit will be returned.'
      : `This class starts in less than ${CANCEL_NOTICE_HOURS} hours, so the credit can't be returned. Cancel anyway?`
    if (!window.confirm(warning)) return
    const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: b.id })
    setMessage(error
      ? { type: 'error', text: errorText(error) }
      : { type: 'ok', text: data.status === 'cancelled' ? 'Class cancelled — credit returned.' : 'Class cancelled.' })
    fetchData()
  }

  return (
    <section style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: SLATE }}><span>🗓️</span>My classes</span>
      <div className="nb-card" style={card}>

        {/* Credit balance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: LIGHT, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 22, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
              {credits} credit{credits === 1 ? '' : 's'}
            </p>
            {usable.length > 0 && (
              <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>
                {usable.map(g => `${g.remaining} ${expiryLabel(g)}`).join(' · ')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {credits > 0 && !picking && <button onClick={() => { setPicking(true); setMessage(null) }} style={addBtn}>+ Book a class</button>}
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ ...cancelBtn, textDecoration: 'none' }}>
              Buy more credits
            </a>
          </div>
        </div>

        {message && (
          <p style={{ fontSize: 13, fontWeight: 600, color: message.type === 'error' ? DANGER : OLIVE, margin: '0 0 14px' }}>{message.text}</p>
        )}

        {picking && (
          <SlotPicker
            grants={usable}
            onCancel={() => setPicking(false)}
            onBooked={b => { setPicking(false); setMessage({ type: 'ok', text: `Booked! See you ${formatDateTime(b.starts_at)}.` }); fetchData() }}
          />
        )}

        {/* Upcoming classes */}
        {bookings.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
            {credits > 0 ? 'No classes booked yet — pick a time above.' : 'No classes booked. Message me on WhatsApp to get more credits.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: LIGHT, borderRadius: 10, padding: '10px 12px' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>{formatDay(b.starts_at)}</p>
                  <p className="nb-mono" style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>{formatTime(b.starts_at)} – {formatTime(b.ends_at)}</p>
                </div>
                <button onClick={() => cancel(b)} style={{ ...smallBtn, color: DANGER }}>Cancel</button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: MUTED, margin: '14px 0 0', lineHeight: 1.5 }}>
          Classes are small groups. Times shown in your time zone ({userTimeZone}). Cancel at least {CANCEL_NOTICE_HOURS}h before class to get your credit back.
          Monthly credits are valid for classes in that month only.
        </p>
      </div>
    </section>
  )
}

/* ── Open slots for the next few weeks, grouped by day ── */
function SlotPicker({ grants, onCancel, onBooked }) {
  const [slots, setSlots] = useState(null)
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState(null)

  const loadSlots = useCallback(async () => {
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + BOOKING_WINDOW_DAYS)
    const { data, error } = await supabase.rpc('available_slots', { p_from: localDateString(from), p_to: localDateString(to) })
    if (error) setError(errorText(error))
    setSlots(data || [])
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])

  // Only offer times the student actually has a valid credit for
  // (e.g. October's monthly credits can't book a class in November).
  const byDay = useMemo(() => {
    const coveredBy = s => {
      const t = new Date(s.starts_at)
      return grants.some(g => t >= new Date(g.valid_from) && (!g.expires_at || t < new Date(g.expires_at)))
    }
    const groups = new Map()
    for (const s of (slots || []).filter(coveredBy)) {
      const key = localDateString(new Date(s.starts_at))
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(s)
    }
    return [...groups.values()]
  }, [slots, grants])

  async function book(s) {
    if (!window.confirm(`Book the group class on ${formatDateTime(s.starts_at)}? This uses 1 credit.`)) return
    setBooking(s.starts_at)
    setError(null)
    const { data, error } = await supabase.rpc('book_class', { p_starts_at: s.starts_at })
    setBooking(null)
    if (error) { setError(errorText(error)); loadSlots(); return }
    onBooked(data)
  }

  return (
    <div style={{ background: LIGHT, borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>Pick a group class</p>
        <button onClick={onCancel} style={smallBtn}>Close</button>
      </div>
      {error && <p style={{ fontSize: 13, fontWeight: 600, color: DANGER, margin: '0 0 12px' }}>{error}</p>}
      {slots === null ? (
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Loading times…</p>
      ) : byDay.length === 0 ? (
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No open spots right now. Message me on WhatsApp and we'll find one!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
          {byDay.map(day => (
            <div key={day[0].starts_at}>
              <p className="nb-mono" style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: '0 0 6px', textTransform: 'uppercase' }}>{formatDay(day[0].starts_at)}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {day.map(s => (
                  <button key={s.starts_at} onClick={() => book(s)} disabled={booking !== null} style={{
                    padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${ACCENT}`,
                    background: booking === s.starts_at ? ACCENT : 'white', color: booking === s.starts_at ? 'white' : ACCENT,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                    {formatTime(s.starts_at)}
                    <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, opacity: 0.8 }}>
                      {s.spots_left} spot{s.spots_left === 1 ? '' : 's'} left
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
