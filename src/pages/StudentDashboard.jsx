import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [feedback, setFeedback] = useState([])
  const [classes, setClasses] = useState([])

  useEffect(() => {
    if (!profile) return
    fetchData()
  }, [profile])

  async function fetchData() {
    const studentId = profile.id
    const [{ data: sa }, { data: sv }, { data: fb }, { data: ce }] = await Promise.all([
      supabase.from('student_assignments').select('*, assignments(*)').eq('student_id', studentId),
      supabase.from('student_vocabulary').select('*, vocabulary(*)').eq('student_id', studentId),
      supabase.from('feedback').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
      supabase.from('class_enrollments').select('*, classes(*)').eq('student_id', studentId),
    ])
    setAssignments(sa || [])
    setVocabulary(sv || [])
    setFeedback(fb || [])
    setClasses(ce || [])
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const mastered = vocabulary.filter(v => v.status === 'mastered').length
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--card-cream)', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '28px 32px 24px', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: 'var(--text-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: 'var(--card-green)', fontSize: 20, flexShrink: 0,
          }}>
            {firstName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineHeight: 1.1 }}>Hi, {firstName}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, marginTop: 3 }}>Here's everything for your week, all in one place.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Pill>{today}</Pill>
          <Pill>{mastered} of {vocabulary.length} words mastered</Pill>
          <button onClick={signOut} style={{
            background: 'none', border: '1.5px solid rgba(67,73,42,0.2)', borderRadius: 20,
            padding: '7px 16px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </div>

      {/* 3-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        padding: '0 32px',
        alignItems: 'start',
      }}>
        {/* Left: Classes */}
        <ClassesPanel classes={classes} feedback={feedback} />

        {/* Center: Vocabulary */}
        <VocabularyPanel vocabulary={vocabulary} onRefresh={fetchData} />

        {/* Right: Assignments + What to work with */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AssignmentsPanel assignments={assignments} profile={profile} onRefresh={fetchData} />
          <WorkWithPanel profile={profile} />
        </div>
      </div>
    </div>
  )
}

function Pill({ children }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: '8px 16px',
      fontSize: 13, color: 'var(--text-dark)', fontWeight: 500,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>{children}</div>
  )
}

function PanelHeader({ dot, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot || 'var(--text-dark)', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-dark)', textTransform: 'uppercase' }}>{title}</span>
      </div>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, paddingLeft: 18 }}>{subtitle}</p>}
    </div>
  )
}

function Panel({ children, dark }) {
  return (
    <div style={{
      background: dark ? 'var(--text-dark)' : 'white',
      borderRadius: 20, padding: '20px 22px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    }}>
      {children}
    </div>
  )
}

/* ── Classes ── */
function ClassesPanel({ classes, feedback }) {
  return (
    <Panel>
      <PanelHeader title="Your Classes" subtitle="Jump in, and read this week's note from me." />
      {classes.length === 0 && <p style={emptyStyle}>Not enrolled in any classes yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {classes.map((ce, i) => {
          const classNote = feedback.find(f => f.type === 'class_note' && f.class_id === ce.classes?.id)
          const note = classNote?.content || ce.classes?.description || null
          return (
            <div key={ce.id} style={{
              paddingTop: i === 0 ? 0 : 16, paddingBottom: 16,
              borderBottom: i < classes.length - 1 ? '1px solid rgba(67,73,42,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)', margin: 0 }}>{ce.classes?.name}</p>
                  {ce.classes?.schedule && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{ce.classes.schedule}</p>
                  )}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(67,73,42,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, cursor: 'pointer',
                }}>↗</div>
              </div>
              {note && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--card-olive)', background: 'rgba(141,154,85,0.1)', borderRadius: 6, padding: '2px 6px', flexShrink: 0, marginTop: 1 }}>NOTE</span>
                  <p style={{ fontSize: 13, color: 'var(--text-dark)', margin: 0, lineHeight: 1.5 }}>{note}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

/* ── Vocabulary ── */
function VocabularyPanel({ vocabulary, onRefresh }) {
  async function updateStatus(id, status) {
    await supabase.from('student_vocabulary').update({ status }).eq('id', id)
    onRefresh()
  }

  const mastered = vocabulary.filter(v => v.status === 'mastered').length
  const progress = vocabulary.length ? Math.round((mastered / vocabulary.length) * 100) : 0

  return (
    <Panel>
      <PanelHeader title="Vocabulary Practice" subtitle="Tap a card to flip it. Mark each word as you go." />
      {vocabulary.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 5, background: 'rgba(67,73,42,0.1)', borderRadius: 99, marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--card-olive)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}
      {vocabulary.length === 0
        ? <p style={emptyStyle}>No vocabulary assigned yet.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {vocabulary.map(sv => <FlipCard key={sv.id} sv={sv} onUpdate={updateStatus} />)}
          </div>
        )
      }
    </Panel>
  )
}

function FlipCard({ sv, onUpdate }) {
  const [flipped, setFlipped] = useState(false)
  const isMastered = sv.status === 'mastered'

  return (
    <div onClick={() => setFlipped(f => !f)} style={{ cursor: 'pointer', perspective: 600 }}>
      <div style={{
        position: 'relative', minHeight: 160,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s ease',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: isMastered ? '#e8edcf' : '#f5f6ee',
          borderRadius: 14, padding: '16px 14px',
          display: 'flex', flexDirection: 'column',
          border: '1.5px solid rgba(67,73,42,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tap to flip</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <strong style={{ fontSize: 18, color: 'var(--text-dark)', lineHeight: 1.2 }}>{sv.vocabulary?.word}</strong>
          </div>
        </div>

        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: '#f5f6ee', borderRadius: 14, padding: '14px 14px',
          display: 'flex', flexDirection: 'column',
          border: '1.5px solid rgba(67,73,42,0.1)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tap to flip</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.5, marginBottom: 4, fontWeight: 600 }}>{sv.vocabulary?.definition}</p>
          {sv.vocabulary?.example && (
            <p style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8 }}>{sv.vocabulary.example}</p>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <button onClick={() => onUpdate(sv.id, 'mastered')} style={{
              padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700,
              background: 'var(--text-dark)', color: 'var(--card-green)', cursor: 'pointer',
            }}>Got it</button>
            <button onClick={() => onUpdate(sv.id, 'learning')} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1.5px solid var(--card-olive)', background: 'transparent', color: 'var(--card-olive)',
            }}>Practice</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Assignments ── */
function AssignmentsPanel({ assignments, profile, onRefresh }) {
  const pending = assignments.filter(a => a.status !== 'completed')
  const done = assignments.filter(a => a.status === 'completed')

  return (
    <Panel>
      <PanelHeader title="Your Assignments" subtitle="Picked just for you — check them off as you finish." />
      {pending.length === 0 && done.length === 0 && <p style={emptyStyle}>No assignments yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {pending.map((sa, i) => (
          <AssignmentRow key={sa.id} sa={sa} profile={profile} onRefresh={onRefresh}
            last={i === pending.length - 1 && done.length === 0} />
        ))}
        {done.map((sa, i) => (
          <AssignmentRow key={sa.id} sa={sa} profile={profile} onRefresh={onRefresh} done last={i === done.length - 1} />
        ))}
      </div>
    </Panel>
  )
}

function AssignmentRow({ sa, profile, onRefresh, done, last }) {
  const [expanded, setExpanded] = useState(false)
  const [response, setResponse] = useState(sa.student_response || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fileName, setFileName] = useState(sa.attachment_name || '')
  const fileRef = useRef()

  async function markActivity() {
    await supabase.from('feedback').insert({ student_id: profile.id, content: 'assignment_update', type: 'student_activity' })
  }

  async function toggle() {
    const newStatus = sa.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('student_assignments').update({ status: newStatus }).eq('id', sa.id)
    if (newStatus === 'completed') await markActivity()
    onRefresh()
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${profile.id}/${sa.id}/${file.name}`
    const { error } = await supabase.storage.from('assignment-attachments').upload(path, file, { upsert: true })
    if (!error) {
      await supabase.from('student_assignments').update({ attachment_url: path, attachment_name: file.name }).eq('id', sa.id)
      setFileName(file.name)
      await markActivity()
    }
    setUploading(false)
  }

  async function saveResponse() {
    setSaving(true)
    await supabase.from('student_assignments').update({ student_response: response }).eq('id', sa.id)
    await markActivity()
    setSaving(false)
  }

  const dueLabel = sa.assignments?.due_date
    ? new Date(sa.assignments.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid rgba(67,73,42,0.08)', paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button onClick={toggle} style={{
          width: 20, height: 20, borderRadius: 6, border: '2px solid rgba(67,73,42,0.25)',
          background: done ? 'var(--card-olive)' : 'transparent', flexShrink: 0, marginTop: 2,
          cursor: done ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {done && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: done ? 'var(--text-muted)' : 'var(--text-dark)', margin: 0, textDecoration: done ? 'line-through' : 'none' }}>
              {sa.assignments?.title || '(Untitled)'}
            </p>
            {dueLabel && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dark)', background: 'rgba(67,73,42,0.08)', borderRadius: 8, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {dueLabel}
              </span>
            )}
          </div>
          {sa.assignments?.description && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', lineHeight: 1.4 }}>{sa.assignments.description}</p>
          )}
          {sa.grade && <p style={{ fontSize: 12, color: 'var(--card-olive)', margin: '3px 0 0', fontWeight: 600 }}>Grade: {sa.grade}</p>}
          {!done && (
            <button onClick={() => setExpanded(x => !x)} style={{ fontSize: 11, color: 'var(--card-olive)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', fontWeight: 600 }}>
              {expanded ? 'Hide response ↑' : 'Add response ↓'}
            </button>
          )}
          {expanded && !done && (
            <div style={{ marginTop: 8 }}>
              <textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="Write your answer here..." rows={2}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1.5px solid rgba(67,73,42,0.15)', background: '#f5f6ee', color: 'var(--text-dark)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={chipBtn}>
                  📎 {uploading ? 'Uploading…' : fileName || 'Attach file'}
                </button>
                <button onClick={saveResponse} disabled={saving} style={{ ...chipBtn, background: 'var(--text-dark)', color: 'var(--card-green)' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={toggle} style={{ ...chipBtn, background: 'var(--card-olive)', color: 'white' }}>✓ Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── What should we work with ── */
const MATERIALS = ['Videos', 'Practice quizzes', 'Flashcards', 'Reading passages', 'Games', 'Audio lessons']

function WorkWithPanel({ profile }) {
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
    if (!error) setSent(true)
  }

  return (
    <Panel dark>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(194,202,134,0.6)', textTransform: 'uppercase' }}>What should we work with?</span>
        <p style={{ fontSize: 13, color: 'rgba(194,202,134,0.7)', margin: '4px 0 0' }}>Pick the kinds of materials you enjoy most.</p>
      </div>
      {sent ? (
        <p style={{ fontSize: 14, color: 'var(--card-green)', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>Sent to your tutor! ✓</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {MATERIALS.map(m => (
              <button key={m} onClick={() => toggle(m)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selected.includes(m) ? 'var(--card-green)' : 'transparent',
                color: selected.includes(m) ? 'var(--text-dark)' : 'rgba(194,202,134,0.8)',
                border: `1.5px solid ${selected.includes(m) ? 'var(--card-green)' : 'rgba(194,202,134,0.25)'}`,
              }}>{m}</button>
            ))}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything specific you'd like? (optional)" rows={2}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(194,202,134,0.9)', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={send} style={{
            width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, border: 'none',
            background: 'var(--card-green)', color: 'var(--text-dark)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Send to my tutor</button>
        </>
      )}
    </Panel>
  )
}

const emptyStyle = { fontSize: 13, color: 'var(--text-muted)', margin: 0 }
const chipBtn = { padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(67,73,42,0.1)', color: 'var(--text-dark)' }
