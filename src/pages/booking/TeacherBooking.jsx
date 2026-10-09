import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  LIGHT, TEXT, MUTED, OLIVE, SLATE, DANGER, WEEKDAYS,
  card, addBtn, smallBtn, input,
  formatDay, formatTime, formatDateTime, usableGrants, expiryLabel, errorText,
} from './shared'

const TEACHER_TZ_NOTE = 'Times are in São Paulo time (America/Sao_Paulo).'

/* ── All upcoming classes + monthly credit button (dashboard home) ── */
export function UpcomingClassesSection() {
  const [bookings, setBookings] = useState([])
  const [message, setMessage] = useState(null)

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*, profiles(full_name, email)')
      .eq('status', 'booked').gte('ends_at', new Date().toISOString()).order('starts_at')
    setBookings(data || [])
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function grantMonthly() {
    const { data, error } = await supabase.rpc('grant_monthly_credits')
    setMessage(error ? errorText(error)
      : data === 0 ? 'Everyone on a monthly plan already has this month\'s credits.'
      : `Gave this month's credits to ${data} student${data === 1 ? '' : 's'}.`)
  }

  async function cancel(b) {
    if (!window.confirm(`Remove ${b.profiles?.full_name || b.profiles?.email} from the class on ${formatDateTime(b.starts_at)}? Their credit will be returned.`)) return
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: b.id })
    if (error) setMessage(errorText(error))
    fetchData()
  }

  async function cancelClass(group) {
    if (!window.confirm(`Cancel the whole class on ${formatDateTime(group[0].starts_at)}? All ${group.length} student${group.length === 1 ? '' : 's'} get their credit back.`)) return
    const results = await Promise.all(group.map(b => supabase.rpc('cancel_booking', { p_booking_id: b.id })))
    const failed = results.find(r => r.error)
    setMessage(failed ? errorText(failed.error) : 'Class cancelled — everyone got their credit back. Let them know on WhatsApp!')
    fetchData()
  }

  // One entry per class time, each holding that class's student bookings
  const classes = Object.values(bookings.reduce((acc, b) => {
    (acc[b.starts_at] ||= []).push(b)
    return acc
  }, {}))

  return (
    <section style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: SLATE }}><span>🗓️</span>Upcoming classes{classes.length > 0 ? ` (${classes.length})` : ''}</span>
      <div className="nb-card" style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Monthly plans get their credits on the 1st (or click to give them now — it never double-gives).</p>
          <button onClick={grantMonthly} style={addBtn}>Give this month's credits</button>
        </div>
        {message && <p style={{ fontSize: 13, fontWeight: 600, color: OLIVE, margin: '0 0 14px' }}>{message}</p>}
        {classes.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No classes booked.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {classes.map(group => (
              <div key={group[0].starts_at} style={{ background: LIGHT, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: 0 }}>
                    {formatDay(group[0].starts_at)} · {formatTime(group[0].starts_at)} – {formatTime(group[0].ends_at)}
                    <span className="nb-mono" style={{ fontSize: 11, fontWeight: 600, color: MUTED }}> · {group.length} student{group.length === 1 ? '' : 's'}</span>
                  </p>
                  <button onClick={() => cancelClass(group)} style={{ ...smallBtn, color: DANGER }}>Cancel class</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.map(b => (
                    <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 20, padding: '4px 6px 4px 12px', fontSize: 12.5, color: TEXT }}>
                      {b.profiles?.full_name || b.profiles?.email}
                      <button onClick={() => cancel(b)} title="Remove from this class" style={{ border: 'none', background: 'transparent', color: DANGER, cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ── Weekly availability + time off ── */
export function AvailabilitySection() {
  const [rows, setRows] = useState([])
  const [timeOff, setTimeOff] = useState([])
  const [form, setForm] = useState({ weekday: 1, start_time: '18:00', end_time: '21:00', slot_minutes: 60, capacity: 5 })
  const [offForm, setOffForm] = useState({ starts_on: '', ends_on: '', note: '' })
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('availability').select('*').order('weekday').order('start_time'),
      supabase.from('time_off').select('*').gte('ends_on', new Date().toISOString().slice(0, 10)).order('starts_on'),
    ])
    setRows(a || [])
    setTimeOff(t || [])
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function addRow() {
    setError(null)
    const { error } = await supabase.from('availability').insert({ ...form, weekday: Number(form.weekday), slot_minutes: Number(form.slot_minutes), capacity: Number(form.capacity) })
    if (error) setError(errorText(error))
    fetchData()
  }

  async function addTimeOff() {
    if (!offForm.starts_on) return
    setError(null)
    const { error } = await supabase.from('time_off').insert({
      starts_on: offForm.starts_on, ends_on: offForm.ends_on || offForm.starts_on, note: offForm.note.trim() || null,
    })
    if (error) setError(errorText(error))
    setOffForm({ starts_on: '', ends_on: '', note: '' })
    fetchData()
  }

  async function remove(table, id) {
    await supabase.from(table).delete().eq('id', id)
    fetchData()
  }

  return (
    <section style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: OLIVE }}><span>⏰</span>My availability</span>
      <div className="nb-card" style={card}>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 14px' }}>
          Each window is split into group classes; students can book a seat until the class is full (at least 12h ahead). {TEACHER_TZ_NOTE}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: LIGHT, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <Labeled label="Day">
            <select value={form.weekday} onChange={e => setForm(f => ({ ...f, weekday: e.target.value }))} style={input}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Labeled>
          <Labeled label="From"><input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={input} /></Labeled>
          <Labeled label="To"><input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={input} /></Labeled>
          <Labeled label="Class length">
            <select value={form.slot_minutes} onChange={e => setForm(f => ({ ...f, slot_minutes: e.target.value }))} style={input}>
              {[30, 45, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Labeled>
          <Labeled label="Students per class">
            <input type="number" min="1" max="20" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} style={{ ...input, width: 80 }} />
          </Labeled>
          <button onClick={addRow} style={addBtn}>+ Add</button>
        </div>
        {error && <p style={{ fontSize: 13, fontWeight: 600, color: DANGER, margin: '0 0 12px' }}>{error}</p>}

        {rows.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 18px' }}>No availability yet — students can't book until you add some.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: LIGHT, borderRadius: 10, padding: '8px 12px' }}>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>
                  <strong>{WEEKDAYS[r.weekday]}</strong> {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} <span style={{ color: MUTED }}>· {r.slot_minutes} min · up to {r.capacity} student{r.capacity === 1 ? '' : 's'}</span>
                </p>
                <button onClick={() => remove('availability', r.id)} style={{ ...smallBtn, color: DANGER }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, margin: '0 0 8px' }}>🌴 Time off</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: LIGHT, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Labeled label="From"><input type="date" value={offForm.starts_on} onChange={e => setOffForm(f => ({ ...f, starts_on: e.target.value }))} style={input} /></Labeled>
          <Labeled label="To (optional)"><input type="date" value={offForm.ends_on} onChange={e => setOffForm(f => ({ ...f, ends_on: e.target.value }))} style={input} /></Labeled>
          <Labeled label="Note"><input value={offForm.note} onChange={e => setOffForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Holiday" style={input} /></Labeled>
          <button onClick={addTimeOff} style={addBtn}>+ Block</button>
        </div>
        {timeOff.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: LIGHT, borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
            <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>
              {t.starts_on}{t.ends_on !== t.starts_on ? ` → ${t.ends_on}` : ''}{t.note ? <span style={{ color: MUTED }}> · {t.note}</span> : null}
            </p>
            <button onClick={() => remove('time_off', t.id)} style={{ ...smallBtn, color: DANGER }}>Remove</button>
          </div>
        ))}
        <p style={{ fontSize: 11.5, color: MUTED, margin: '8px 0 0' }}>Blocking days hides them from booking — it doesn't cancel classes already booked.</p>
      </div>
    </section>
  )
}

/* ── One student's plan, credits and classes (student editor) ── */
export function StudentCreditsSection({ student }) {
  const [plan, setPlan] = useState('')
  const [grants, setGrants] = useState([])
  const [bookings, setBookings] = useState([])
  const [pack, setPack] = useState({ amount: 4, reason: 'purchase', note: '' })
  const [message, setMessage] = useState(null)

  const fetchData = useCallback(async () => {
    const sid = student.id
    const [{ data: p }, { data: g }, { data: b }] = await Promise.all([
      supabase.from('credit_plans').select('*').eq('student_id', sid).maybeSingle(),
      supabase.from('credit_grant_balances').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('student_id', sid).order('starts_at', { ascending: false }).limit(20),
    ])
    setPlan(p ? String(p.monthly_credits) : '')
    setGrants(g || [])
    setBookings(b || [])
  }, [student.id])

  useEffect(() => { fetchData() }, [fetchData])

  async function savePlan() {
    const n = Number(plan)
    const { error } = n > 0
      ? await supabase.from('credit_plans').upsert({ student_id: student.id, monthly_credits: n })
      : await supabase.from('credit_plans').delete().eq('student_id', student.id)
    setMessage(error ? errorText(error) : n > 0 ? `Monthly plan saved: ${n} credits/month.` : 'Monthly plan removed.')
    fetchData()
  }

  async function addCredits() {
    const amount = Number(pack.amount)
    if (!(amount > 0)) return
    const { error } = await supabase.from('credit_grants').insert({
      student_id: student.id, amount, reason: pack.reason, note: pack.note.trim() || null,
    })
    setMessage(error ? errorText(error) : `Added ${amount} credit${amount === 1 ? '' : 's'}.`)
    setPack(p => ({ ...p, note: '' }))
    fetchData()
  }

  async function removeGrant(g) {
    if (g.used > 0) { setMessage('This grant already paid for classes — cancel those first.'); return }
    if (!window.confirm(`Remove ${g.amount} credit${g.amount === 1 ? '' : 's'}?`)) return
    await supabase.from('credit_grants').delete().eq('id', g.id)
    fetchData()
  }

  async function cancel(b) {
    if (!window.confirm(`Cancel the class on ${formatDateTime(b.starts_at)}? The credit will be returned.`)) return
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: b.id })
    if (error) setMessage(errorText(error))
    fetchData()
  }

  const credits = usableGrants(grants).reduce((n, g) => n + g.remaining, 0)
  const now = new Date()

  return (
    <section style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: SLATE }}><span>🎟️</span>Credits & classes</span>
      <div className="nb-card" style={card}>
        <p style={{ fontWeight: 800, fontSize: 20, color: TEXT, margin: '0 0 14px', fontFamily: "'Playfair Display', Georgia, serif" }}>
          {credits} credit{credits === 1 ? '' : 's'} available
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: LIGHT, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Labeled label="Monthly plan (credits/month, empty = none)">
            <input type="number" min="0" value={plan} onChange={e => setPlan(e.target.value)} placeholder="e.g. 4" style={{ ...input, width: 120 }} />
          </Labeled>
          <button onClick={savePlan} style={addBtn}>Save plan</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', background: LIGHT, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <Labeled label="Add credits">
            <input type="number" min="1" value={pack.amount} onChange={e => setPack(p => ({ ...p, amount: e.target.value }))} style={{ ...input, width: 80 }} />
          </Labeled>
          <Labeled label="Type">
            <select value={pack.reason} onChange={e => setPack(p => ({ ...p, reason: e.target.value }))} style={input}>
              <option value="purchase">Purchase (paid)</option>
              <option value="gift">Gift / make-up</option>
            </select>
          </Labeled>
          <Labeled label="Note (optional)">
            <input value={pack.note} onChange={e => setPack(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Pix 09/10" style={input} />
          </Labeled>
          <button onClick={addCredits} style={addBtn}>+ Add</button>
        </div>
        <p style={{ fontSize: 11.5, color: MUTED, margin: '0 0 14px' }}>Purchased and gift credits don't expire. Monthly plan credits expire at the end of their month.</p>

        {message && <p style={{ fontSize: 13, fontWeight: 600, color: OLIVE, margin: '0 0 14px' }}>{message}</p>}

        {grants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {grants.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: LIGHT, borderRadius: 10, padding: '8px 12px' }}>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>
                  <strong>{g.remaining}/{g.amount}</strong> left · {g.reason === 'monthly' ? `monthly ${g.plan_month}` : g.reason} · <span style={{ color: MUTED }}>{expiryLabel(g)}{g.note ? ` · ${g.note}` : ''}</span>
                </p>
                <button onClick={() => removeGrant(g)} style={{ ...smallBtn, color: DANGER }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontWeight: 700, fontSize: 13, color: TEXT, margin: '0 0 8px' }}>Classes</p>
        {bookings.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No classes booked yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bookings.map(b => {
              const upcoming = b.status === 'booked' && new Date(b.ends_at) > now
              const label = b.status === 'cancelled' ? 'Cancelled · refunded' : b.status === 'late_cancelled' ? 'Late cancel · credit used' : upcoming ? 'Upcoming' : 'Done'
              return (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: LIGHT, borderRadius: 10, padding: '8px 12px', opacity: b.status === 'booked' ? 1 : 0.65 }}>
                  <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{formatDateTime(b.starts_at)} <span style={{ color: MUTED }}>· {label}</span></p>
                  {upcoming && <button onClick={() => cancel(b)} style={{ ...smallBtn, color: DANGER }}>Cancel</button>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function Labeled({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
