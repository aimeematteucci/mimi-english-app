import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ACCENT = '#c17c4a'
const SIDEBAR_BG = '#e8e1d8'
const PAGE_BG = '#f2ece4'
const CARD_BG = '#ffffff'
const LIGHT = '#f8f5f2'
const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const OLIVE = '#8d9a55'

const FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav,.ogg'
const MAX_FILE_MB = 20

export default function Notebook() {
  const { profile, signOut } = useAuth()
  const [studentLessons, setStudentLessons] = useState([])
  const [feedback, setFeedback] = useState([])
  const [files, setFiles] = useState([])
  const [suggestions, setSuggestions] = useState([])

  const fetchData = useCallback(async () => {
    const sid = profile.id
    const [{ data: sl }, { data: fb }, { data: sf }] = await Promise.all([
      supabase.from('student_lessons').select('*, lessons(*)').eq('student_id', sid),
      supabase.from('feedback').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      supabase.from('student_files').select('*').eq('student_id', sid).order('uploaded_at', { ascending: false }),
    ])
    setStudentLessons(sl || [])
    const allFb = fb || []
    setFeedback(allFb.filter(f => f.type !== 'preference' && f.type !== 'suggestion'))
    setSuggestions(allFb.filter(f => f.type === 'suggestion'))
    setFiles(sf || [])
  }, [profile])

  useEffect(() => {
    if (!profile) return
    fetchData()
  }, [profile, fetchData])

  async function toggleLesson(sl) {
    const newStatus = sl.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('student_lessons').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', sl.id)
    fetchData()
  }

  const completedCount = studentLessons.filter(sl => sl.status === 'completed').length
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: SIDEBAR_BG,
        padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24,
        borderRight: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#d4c4b5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#5c4a3a',
          }}>{firstName[0]?.toUpperCase()}</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: TEXT, margin: 0, textAlign: 'center' }}>{profile?.full_name}</p>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={signOut} style={{
            width: '100%', padding: '9px', borderRadius: 10,
            border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent',
            fontSize: 13, color: MUTED, cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', maxWidth: 900 }}>

        {/* Header card */}
        <div style={{
          background: CARD_BG, borderRadius: 20, padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gap: 16,
        }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 800, color: TEXT, margin: 0 }}>
              {firstName}'s Notebook
            </h1>
            <p style={{ fontSize: 14, color: MUTED, margin: '6px 0 0' }}>{greeting}, {firstName}!</p>
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

        {/* Extra activities */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Extra activities</h2>
          <Card>
            {studentLessons.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No activities assigned yet.</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px' }}>{completedCount} of {studentLessons.length} completed</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {studentLessons.map(sl => {
                    const done = sl.status === 'completed'
                    return (
                      <div key={sl.id} onClick={() => toggleLesson(sl)} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s',
                        background: done ? 'rgba(141,154,85,0.09)' : LIGHT,
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
                          }}>{sl.lessons?.title}</p>
                          {sl.lessons?.description && <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{sl.lessons.description}</p>}
                          {sl.lessons?.url && (
                            <a href={sl.lessons.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12, color: ACCENT, fontWeight: 600, margin: '4px 0 0', display: 'inline-block' }}>
                              Open ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </Card>
        </section>

        {/* Vocabulary training — coming soon */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Vocabulary training</h2>
          <Card>
            <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>🚧 Coming soon.</p>
          </Card>
        </section>

        {/* Feedback + Files */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <FeedbackSection feedback={feedback} />
          <FilesSection profile={profile} files={files} onUpdate={fetchData} />
        </div>

        {/* Suggest a lesson */}
        <section>
          <SuggestSection profile={profile} suggestions={suggestions} onSent={fetchData} />
        </section>
      </main>
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
        : feedback.slice(0, 5).map(f => (
          <div key={f.id} style={{ background: LIGHT, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: 0 }}>{f.content}</p>
            <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
              {new Date(f.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        ))}
    </Card>
  )
}

/* ── Files ── */
function FilesSection({ profile, files, onUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File too big — max ${MAX_FILE_MB}MB.`)
      return
    }

    setUploading(true)
    const path = `${profile.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('student-files').upload(path, file)
    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }
    await supabase.from('student_files').insert({ student_id: profile.id, file_name: file.name, storage_path: path })
    setUploading(false)
    onUpdate()
  }

  async function removeFile(f) {
    await supabase.storage.from('student-files').remove([f.storage_path])
    await supabase.from('student_files').delete().eq('id', f.id)
    onUpdate()
  }

  return (
    <Card>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Send a file</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Homework, essays, audio recordings — docs, images, and audio up to {MAX_FILE_MB}MB.</p>

      <label style={{
        display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12,
        border: '1.5px dashed rgba(0,0,0,0.2)', cursor: uploading ? 'default' : 'pointer',
        fontSize: 13, fontWeight: 600, color: uploading ? MUTED : ACCENT, marginBottom: 14,
      }}>
        {uploading ? 'Uploading…' : '📎 Choose a file to send'}
        <input type="file" accept={FILE_ACCEPT} onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
      </label>

      {error && <p style={{ fontSize: 12, color: '#d94f4f', margin: '0 0 12px' }}>{error}</p>}

      {files.length === 0 ? (
        <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No files sent yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: LIGHT, borderRadius: 10, padding: '10px 12px',
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</p>
                <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>{new Date(f.uploaded_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => removeFile(f)} style={{
                background: 'none', border: 'none', color: '#d94f4f', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── Suggest a lesson ── */
const SUGGESTION_TYPES = ['Video', 'Vocabulary', 'Movie', 'Song', 'Other']

function SuggestSection({ profile, suggestions, onSent }) {
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  async function send() {
    if (!selected && !note.trim()) return
    const content = `Suggestion: ${selected || 'Other'}${note.trim() ? `. Details: ${note.trim()}` : ''}`
    const { error } = await supabase.from('feedback').insert({ student_id: profile.id, content, type: 'suggestion' })
    if (!error) {
      setSelected('')
      setNote('')
      setSent(true)
      onSent()
      setTimeout(() => setSent(false), 2000)
    }
  }

  return (
    <Card>
      <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Suggest a lesson</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>A video, a movie, a song, specific vocabulary — anything you'd like to study next.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {SUGGESTION_TYPES.map(t => (
          <button key={t} onClick={() => setSelected(t)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
            background: selected === t ? ACCENT : 'transparent',
            color: selected === t ? 'white' : TEXT,
            border: `1.5px solid ${selected === t ? ACCENT : 'rgba(0,0,0,0.15)'}`,
          }}>{t}</button>
        ))}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)}
        placeholder="Tell us more (title, link, topic…)" rows={2}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.1)', background: LIGHT, resize: 'none', boxSizing: 'border-box', color: TEXT }} />
      <button onClick={send} style={{
        marginTop: 10, padding: '12px 20px', borderRadius: 12, border: 'none',
        background: ACCENT, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>{sent ? 'Sent! ✓' : '✈ Send to my tutor'}</button>

      {suggestions.length > 0 && (
        <div style={{ marginTop: 20, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Sent suggestions</p>
          {suggestions.slice(0, 5).map(s => (
            <div key={s.id} style={{ background: LIGHT, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{s.content}</p>
              <p style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>{new Date(s.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
