import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ACCENT = '#c17c4a'
const SIDEBAR_BG = '#e8e1d8'
const PAGE_BG = '#f2ece4'
const CARD_BG = '#ffffff'
const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const OLIVE = '#8d9a55'
const XP_PER_LEVEL = 200

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [lessons, setLessons] = useState([])
  const [studentLessons, setStudentLessons] = useState([])
  const [assignments, setAssignments] = useState([])
  const [feedback, setFeedback] = useState([])
  const [activities, setActivities] = useState([])
  const [badges, setBadges] = useState([])
  const [classes, setClasses] = useState([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!profile) return
    fetchData()
    updateStreak()
  }, [profile])

  async function updateStreak() {
    const today = new Date().toISOString().split('T')[0]
    const lastActive = profile.last_active_date
    let newStreak = profile.streak || 0

    if (!lastActive) {
      newStreak = 1
    } else if (lastActive === today) {
      setStreak(profile.streak || 0)
      return
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      newStreak = lastActive === yStr ? (profile.streak || 0) + 1 : 1
    }

    setStreak(newStreak)
    await supabase.from('profiles').update({ streak: newStreak, last_active_date: today }).eq('id', profile.id)

    if (newStreak >= 7) {
      await supabase.from('student_badges').upsert(
        { student_id: profile.id, badge_type: '7_day_streak' },
        { onConflict: 'student_id,badge_type' }
      )
    }
  }

  async function fetchData() {
    const sid = profile.id
    const { data: ce } = await supabase.from('class_enrollments').select('*, classes(*)').eq('student_id', sid)
    setClasses(ce || [])

    const classIds = (ce || []).map(c => c.classes?.id).filter(Boolean)

    const [{ data: ls }, { data: sl }, { data: sa }, { data: fb }, { data: act }, { data: bdg }] = await Promise.all([
      classIds.length
        ? supabase.from('lessons').select('*').in('class_id', classIds).order('created_at')
        : Promise.resolve({ data: [] }),
      supabase.from('student_lessons').select('*').eq('student_id', sid),
      supabase.from('student_assignments').select('*, assignments(*)').eq('student_id', sid),
      supabase.from('feedback').select('*').eq('student_id', sid)
        .not('type', 'in', '("preference","class_note","student_activity")')
        .order('created_at', { ascending: false }),
      supabase.from('student_activities').select('*').eq('student_id', sid).order('position'),
      supabase.from('student_badges').select('*').eq('student_id', sid),
    ])

    setLessons(ls || [])
    setStudentLessons(sl || [])
    setAssignments(sa || [])
    setFeedback(fb || [])
    setActivities(act || [])
    setBadges(bdg || [])

    // auto-award perfect homework badge
    const allDone = (sa || []).length > 0 && (sa || []).every(a => a.status === 'completed')
    if (allDone) {
      await supabase.from('student_badges').upsert(
        { student_id: profile.id, badge_type: 'perfect_homework' },
        { onConflict: 'student_id,badge_type' }
      )
    }
  }

  async function toggleLesson(lessonId) {
    const existing = studentLessons.find(sl => sl.lesson_id === lessonId)
    if (existing) {
      const newStatus = existing.status === 'completed' ? 'pending' : 'completed'
      await supabase.from('student_lessons').update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      }).eq('id', existing.id)
    } else {
      await supabase.from('student_lessons').insert({
        student_id: profile.id, lesson_id: lessonId,
        status: 'completed', completed_at: new Date().toISOString(),
      })
    }
    fetchData()
  }

  const completedLessonsCount = studentLessons.filter(sl => sl.status === 'completed').length
  const completedAssignmentsCount = assignments.filter(a => a.status === 'completed').length
  const totalXP = completedLessonsCount * 50 + completedAssignmentsCount * 30
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1
  const xpInLevel = totalXP % XP_PER_LEVEL

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

  const BADGE_LABELS = {
    '7_day_streak': '🔥 7-Day Streak',
    'perfect_homework': '✓ Perfect Homework',
    'quiz_master': '⭐ Quiz Master',
    'word_master': '📚 Word Master',
  }

  const SLOTS = [
    { key: 'vocabulary_match', name: 'Vocabulary Match', icon: '📋' },
    { key: 'listening_podcast', name: 'Listening Podcast', icon: '🎧' },
    { key: 'culture_quiz', name: 'Culture Quiz', icon: '🌎' },
    { key: 'grammar_sprint', name: 'Grammar Sprint', icon: '⚡' },
  ]
  const displayActivities = SLOTS.map(slot => {
    const assigned = activities.find(a => a.slot_key === slot.key)
    return { id: slot.key, name: slot.name, icon: slot.icon, url: assigned?.url || null }
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0, background: SIDEBAR_BG,
        padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24,
        borderRight: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#d4c4b5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#5c4a3a',
          }}>{firstName[0]?.toUpperCase()}</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: TEXT, margin: 0 }}>{profile?.full_name}</p>
            {classes[0]?.classes?.name && (
              <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>{classes[0].classes.name}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <XPRing xp={xpInLevel} maxXP={XP_PER_LEVEL} level={level} />
          <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{xpInLevel} / {XP_PER_LEVEL} XP · Level {level}</p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.55)', borderRadius: 12, padding: '10px 14px',
        }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{streak}-day streak</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Keep it up!</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Badges</p>
            {badges.map(b => (
              <div key={b.id} style={{
                background: 'rgba(255,255,255,0.6)', borderRadius: 10,
                padding: '8px 12px', fontSize: 12, fontWeight: 600, color: TEXT,
              }}>{BADGE_LABELS[b.badge_type] || b.badge_type}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button onClick={signOut} style={{
            width: '100%', padding: '9px', borderRadius: 10,
            border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent',
            fontSize: 13, color: MUTED, cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 960 }}>

        {/* Header card */}
        <div style={{
          background: CARD_BG, borderRadius: 20, padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gap: 16,
        }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 34, fontWeight: 800, color: TEXT, margin: 0 }}>
              {greeting}, {firstName}!
            </h1>
            {classes[0]?.classes?.schedule && (
              <p style={{ fontSize: 14, color: MUTED, margin: '6px 0 0' }}>
                Today's class · {classes[0].classes.schedule}
              </p>
            )}
          </div>
          {profile?.join_link && (
            <a href={profile.join_link} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: 'white',
              borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 600,
              textDecoration: 'none', flexShrink: 0,
            }}>
              🎥 Join class
            </a>
          )}
        </div>

        {/* Lessons */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Lessons</h2>
          <Card>
            {lessons.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No lessons assigned yet.</p>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 13, color: MUTED }}>{completedLessonsCount} of {lessons.length} completed</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: OLIVE }}>{Math.round((completedLessonsCount / lessons.length) * 100)}%</span>
                  </div>
                  <div style={{ height: 8, background: '#e8e1d8', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99, background: OLIVE, transition: 'width 0.4s ease',
                      width: `${(completedLessonsCount / lessons.length) * 100}%`,
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lessons.map(lesson => {
                    const sl = studentLessons.find(s => s.lesson_id === lesson.id)
                    const done = sl?.status === 'completed'
                    return (
                      <div key={lesson.id} onClick={() => toggleLesson(lesson.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s',
                        background: done ? 'rgba(141,154,85,0.09)' : '#f8f5f2',
                        border: `1.5px solid ${done ? 'rgba(141,154,85,0.2)' : 'transparent'}`,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          background: done ? OLIVE : 'white',
                          border: `2px solid ${done ? OLIVE : 'rgba(0,0,0,0.15)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {done && <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontWeight: 600, fontSize: 14, margin: 0,
                            color: done ? MUTED : TEXT, textDecoration: done ? 'line-through' : 'none',
                          }}>{lesson.title}</p>
                          {lesson.description && <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{lesson.description}</p>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: done ? OLIVE : MUTED, flexShrink: 0 }}>
                          {done ? '✓ +50 XP' : '50 XP'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* Feedback + Preferences */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <FeedbackSection feedback={feedback} />
          <PreferencesSection profile={profile} onSent={fetchData} />
        </div>

        {/* Extra activities */}
        <section>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Extra activities</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {displayActivities.map(act => <ActivityCard key={act.id} act={act} />)}
          </div>
        </section>
      </main>
    </div>
  )
}

/* ── XP Ring ── */
function XPRing({ xp, maxXP, level }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (xp / maxXP) * circ
  return (
    <div style={{ position: 'relative', width: 110, height: 110 }}>
      <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={OLIVE} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{xp}</span>
        <span style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>Level {level}</span>
      </div>
    </div>
  )
}

/* ── Card wrapper ── */
function Card({ children }) {
  return (
    <div style={{ background: CARD_BG, borderRadius: 20, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

/* ── Feedback ── */
function FeedbackSection({ feedback }) {
  return (
    <Card>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Feedback from Aimee</h2>
      {feedback.length === 0
        ? <p style={{ fontSize: 14, color: MUTED }}>No feedback yet.</p>
        : feedback.slice(0, 3).map(f => (
          <div key={f.id} style={{ background: '#f8f5f2', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: 0 }}>{f.content}</p>
            <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
              {new Date(f.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        ))}
    </Card>
  )
}

/* ── Preferences ── */
const MATERIALS = ['Videos', 'Games', 'Audio lessons', 'Flashcards', 'Reading passages', 'Other']

function PreferencesSection({ profile, onSent }) {
  const [selected, setSelected] = useState([])
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  function toggle(m) {
    setSelected(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m])
  }

  async function send() {
    if (!selected.length && !note.trim()) return
    const content = `Preferred materials: ${selected.join(', ')}${note.trim() ? `. Notes: ${note.trim()}` : ''}`
    const { error } = await supabase.from('feedback').insert({ student_id: profile.id, content, type: 'preference' })
    if (!error) { setSent(true); onSent() }
  }

  return (
    <Card>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 6 }}>What should we work on?</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Pick the kinds of materials you enjoy most.</p>
      {sent ? (
        <p style={{ fontSize: 14, fontWeight: 600, color: OLIVE, textAlign: 'center', padding: '12px 0' }}>Sent to Aimee! ✓</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {MATERIALS.map(m => (
              <button key={m} onClick={() => toggle(m)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
                background: selected.includes(m) ? ACCENT : 'transparent',
                color: selected.includes(m) ? 'white' : TEXT,
                border: `1.5px solid ${selected.includes(m) ? ACCENT : 'rgba(0,0,0,0.15)'}`,
              }}>{m}</button>
            ))}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Anything specific you'd like? (optional)" rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.1)', background: '#f8f5f2', resize: 'none', boxSizing: 'border-box', color: TEXT }} />
          <button onClick={send} style={{
            width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, border: 'none',
            background: ACCENT, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>✈ Send to my tutor</button>
        </>
      )}
    </Card>
  )
}

/* ── Activity card ── */
function ActivityCard({ act }) {
  const inner = (
    <div style={{
      background: CARD_BG, borderRadius: 16, padding: '22px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      opacity: act.url ? 1 : 0.55,
      cursor: act.url ? 'pointer' : 'default',
    }}>
      <span style={{ fontSize: 28 }}>{act.icon || '📎'}</span>
      <p style={{ fontSize: 13, fontWeight: 600, color: OLIVE, margin: 0, textAlign: 'center' }}>{act.name}</p>
    </div>
  )
  return act.url
    ? <a href={act.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    : inner
}
