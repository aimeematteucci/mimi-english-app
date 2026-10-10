import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ACCENT, LIGHT, TEXT, MUTED, OLIVE, SLATE, DANGER, WHATSAPP_LINK, CANCEL_NOTICE_HOURS,
  card, cancelBtn, smallBtn, userTimeZone,
  formatDay, formatTime, formatDateTime, localDateString, usableGrants, expiryLabel, errorText,
} from './shared'

const MONTHS_AHEAD = 2 // students can browse this month + the next two
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/* ── Student: credits + my classes + book a class ── */
export default function ClassesSection({ profile }) {
  const [grants, setGrants] = useState([])
  const [bookings, setBookings] = useState([])
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
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ ...cancelBtn, textDecoration: 'none' }}>
              Buy more credits
            </a>
          </div>
        </div>

        {message && (
          <p style={{ fontSize: 13, fontWeight: 600, color: message.type === 'error' ? DANGER : OLIVE, margin: '0 0 14px' }}>{message.text}</p>
        )}

        <MonthCalendar
          grants={usable}
          bookings={bookings}
          onBooked={b => { setMessage({ type: 'ok', text: `Booked! See you ${formatDateTime(b.starts_at)}.` }); fetchData() }}
        />

        {/* Upcoming classes */}
        <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, margin: '0 0 8px' }}>Booked classes</p>
        {bookings.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
            {credits > 0 ? 'No classes booked yet — pick a day above.' : 'No classes booked. Message me on WhatsApp to get more credits.'}
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

/* ── Month calendar: days with open classes get a dot; click a day for its times ── */
function MonthCalendar({ grants, bookings, onBooked }) {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [slots, setSlots] = useState(null)
  const [selected, setSelected] = useState(null) // 'YYYY-MM-DD' in the student's time zone
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState(null)

  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0)
  const monthKey = localDateString(monthStart)

  const loadSlots = useCallback(async () => {
    // Pad a day each side: the server works in São Paulo dates, but students
    // abroad group classes by their own local date.
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth() + monthOffset, 0)
    const to = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1)
    const { data, error } = await supabase.rpc('available_slots', { p_from: localDateString(from), p_to: localDateString(to) })
    if (error) setError(errorText(error))
    setSlots(data || [])
  }, [monthOffset])

  useEffect(() => { setSlots(null); setSelected(null); loadSlots() }, [loadSlots])

  // Open classes grouped by local day, limited to this month
  const slotsByDay = useMemo(() => {
    const groups = {}
    for (const s of slots || []) {
      const key = localDateString(new Date(s.starts_at))
      if (key.slice(0, 7) !== monthKey.slice(0, 7)) continue
      ;(groups[key] ||= []).push(s)
    }
    return groups
  }, [slots, monthKey])

  const bookedDays = useMemo(() => new Set(bookings.map(b => localDateString(new Date(b.starts_at)))), [bookings])

  // Auto-select the first day with classes when a month loads
  useEffect(() => {
    if (slots && !selected) setSelected(Object.keys(slotsByDay).sort()[0] || null)
  }, [slots, slotsByDay, selected])

  // Monthly credits only cover classes in their own month, so check per class
  const hasCreditFor = s => {
    const t = new Date(s.starts_at)
    return grants.some(g => t >= new Date(g.valid_from) && (!g.expires_at || t < new Date(g.expires_at)))
  }

  async function book(s) {
    if (!window.confirm(`Book the group class on ${formatDateTime(s.starts_at)}? This uses 1 credit.`)) return
    setBooking(s.starts_at)
    setError(null)
    const { data, error } = await supabase.rpc('book_class', { p_starts_at: s.starts_at })
    setBooking(null)
    loadSlots()
    if (error) { setError(errorText(error)); return }
    onBooked(data)
  }

  // Leading blanks so the 1st lands on its weekday (weeks start on Sunday)
  const cells = [
    ...Array.from({ length: monthStart.getDay() }, () => null),
    ...Array.from({ length: monthEnd.getDate() }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)),
  ]
  const todayKey = localDateString(today)
  const daySlots = (selected && slotsByDay[selected]) || []
  const navBtn = { ...smallBtn, padding: '5px 10px', fontSize: 14 }

  return (
    <div style={{ background: LIGHT, borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
        <button onClick={() => setMonthOffset(m => m - 1)} disabled={monthOffset === 0} aria-label="Previous month"
          style={{ ...navBtn, visibility: monthOffset === 0 ? 'hidden' : 'visible' }}>‹</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => setMonthOffset(m => m + 1)} disabled={monthOffset === MONTHS_AHEAD} aria-label="Next month"
          style={{ ...navBtn, visibility: monthOffset === MONTHS_AHEAD ? 'hidden' : 'visible' }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxWidth: 460, margin: '0 auto' }}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <div key={i} className="nb-mono" style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: MUTED, paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />
          const key = localDateString(date)
          const hasClasses = !!slotsByDay[key]
          const isBooked = bookedDays.has(key)
          const isSelected = key === selected
          const isPast = key < todayKey
          return (
            <button key={key} onClick={() => setSelected(key)} disabled={!hasClasses && !isBooked}
              aria-label={`${date.toLocaleDateString()}${hasClasses ? ', classes available' : ''}${isBooked ? ', you have a class' : ''}`}
              style={{
                position: 'relative', height: 44, borderRadius: 10, padding: 0,
                border: isSelected ? `2px solid ${ACCENT}` : isBooked ? `2px solid ${OLIVE}` : '2px solid transparent',
                background: isSelected ? ACCENT : hasClasses ? 'rgba(193,124,74,0.14)' : 'transparent',
                color: isSelected ? 'white' : isPast ? 'rgba(0,0,0,0.25)' : hasClasses ? ACCENT : TEXT,
                fontSize: 13, fontWeight: hasClasses || isBooked ? 800 : 500,
                cursor: hasClasses || isBooked ? 'pointer' : 'default',
              }}>
              {date.getDate()}
              {hasClasses && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : ACCENT,
                }} />
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', margin: '10px 0 0', fontSize: 11.5, color: MUTED }}>
        <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: ACCENT, marginRight: 5 }} />Classes available</span>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, border: `2px solid ${OLIVE}`, marginRight: 5, verticalAlign: -1 }} />You have a class</span>
      </div>

      {error && <p style={{ fontSize: 13, fontWeight: 600, color: DANGER, margin: '12px 0 0' }}>{error}</p>}

      {/* Times for the selected day */}
      <div style={{ borderTop: '1.5px dashed rgba(0,0,0,0.1)', marginTop: 14, paddingTop: 14, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
        {slots === null ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Loading classes…</p>
        ) : Object.keys(slotsByDay).length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No open classes this month{monthOffset < MONTHS_AHEAD ? ' — try the next one ›' : '.'}</p>
        ) : !selected ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Tap a highlighted day to see its class times.</p>
        ) : (
          <>
            <p className="nb-mono" style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: '0 0 8px', textTransform: 'uppercase' }}>
              {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {bookedDays.has(selected) && (
              <p style={{ fontSize: 12.5, fontWeight: 600, color: OLIVE, margin: '0 0 8px' }}>✓ You have a class this day (see below).</p>
            )}
            {daySlots.length === 0 ? (
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No other open classes this day.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {daySlots.map(s => {
                  const covered = hasCreditFor(s)
                  const active = booking === s.starts_at
                  return (
                    <button key={s.starts_at} onClick={() => book(s)} disabled={booking !== null || !covered}
                      title={covered ? undefined : 'You need a credit valid for this date'}
                      style={{
                        padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${covered ? ACCENT : 'rgba(0,0,0,0.15)'}`,
                        background: active ? ACCENT : 'white', color: active ? 'white' : covered ? ACCENT : MUTED,
                        fontSize: 13, fontWeight: 700, cursor: covered ? 'pointer' : 'not-allowed', opacity: covered ? 1 : 0.7,
                      }}>
                      {formatTime(s.starts_at)}
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, opacity: 0.8 }}>
                        {s.spots_left} spot{s.spots_left === 1 ? '' : 's'} left
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {daySlots.some(s => !hasCreditFor(s)) && (
              <p style={{ fontSize: 12, color: MUTED, margin: '10px 0 0' }}>
                You don't have a credit for {daySlots.every(s => !hasCreditFor(s)) ? 'these classes' : 'the greyed-out classes'} yet —{' '}
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 700 }}>message me on WhatsApp</a>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
