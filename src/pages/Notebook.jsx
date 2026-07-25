import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './notebook.css'

const ACCENT = '#c17c4a'
const PAGE_BG = '#f2ece4'
const CARD_BG = '#ffffff'
const LIGHT = '#f8f5f2'
const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const OLIVE = '#8d9a55'
const SLATE = '#6f8fa3'
const PLUM = '#a56b7c'
const GRAY = '#948a7d'

const FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav,.ogg'
const MAX_FILE_MB = 20

export default function Notebook() {
  const { profile, signOut } = useAuth()
  const [studentLessons, setStudentLessons] = useState([])
  const [feedback, setFeedback] = useState([])
  const [files, setFiles] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [vocabCount, setVocabCount] = useState(0)

  const fetchData = useCallback(async () => {
    const sid = profile.id
    const [{ data: sl }, { data: fb }, { data: sf }, { count }] = await Promise.all([
      supabase.from('student_lessons').select('*, lessons(*)').eq('student_id', sid),
      supabase.from('feedback').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      supabase.from('student_files').select('*').eq('student_id', sid).order('uploaded_at', { ascending: false }),
      supabase.from('student_vocabulary').select('id', { count: 'exact', head: true }).eq('student_id', sid),
    ])
    setStudentLessons(sl || [])
    const allFb = fb || []
    setFeedback(allFb.filter(f => f.type !== 'preference' && f.type !== 'suggestion'))
    setSuggestions(allFb.filter(f => f.type === 'suggestion'))
    setFiles(sf || [])
    setVocabCount(count || 0)
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
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Hero cover ── */}
      <div className="nb-hero" style={{ padding: '54px 32px 64px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4c4b5, #b89a82)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: '#3a2e22', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}>{firstName[0]?.toUpperCase()}</div>
            <div>
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontSize: 44, fontWeight: 800,
                color: '#f7f2ea', margin: 0, lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)',
              }}>
                {firstName}'s Notebook
              </h1>
              <p style={{
                fontFamily: "'Caveat', cursive", fontSize: 24, fontWeight: 700,
                color: '#e3d9c8', margin: '4px 0 0',
              }}>
                {greeting}, {firstName}! ✎
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile?.join_link && (
              <a href={profile.join_link} target="_blank" rel="noopener noreferrer" className="nb-hero-cta" style={{
                display: 'flex', alignItems: 'center', gap: 10, background: ACCENT, color: 'white',
                borderRadius: 14, padding: '15px 26px', fontSize: 16, fontWeight: 700,
                textDecoration: 'none', flexShrink: 0,
              }}>
                ▶ Join class
              </a>
            )}
            <button onClick={signOut} style={{
              padding: '15px 18px', borderRadius: 14,
              border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent',
              fontSize: 13, color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
            }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>

          {/* spiral binding along the left edge */}
          <div className="nb-spiral">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="nb-ring" />)}
          </div>

          <main className="nb-page" style={{ padding: '40px 8px 60px 36px' }}>
            <div className="nb-margin-line" />

            {/* Extra activities */}
            <Section tab="Extra activities" color={OLIVE} icon="📌">
              {studentLessons.length === 0 ? (
                <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No activities assigned yet.</p>
              ) : (
                <>
                  <p className="nb-mono" style={{ fontSize: 12, color: MUTED, margin: '0 0 14px' }}>{completedCount} / {studentLessons.length} completed</p>
                  <div className="nb-shelf">
                    {studentLessons.map(sl => {
                      const done = sl.status === 'completed'
                      return (
                        <div key={sl.id} onClick={() => toggleLesson(sl)} className="nb-shelf-card" style={{
                          background: done ? 'rgba(141,154,85,0.09)' : LIGHT,
                          border: `1.5px solid ${done ? 'rgba(141,154,85,0.25)' : 'rgba(0,0,0,0.06)'}`,
                          borderRadius: 14, padding: '16px 16px 18px',
                        }}>
                          {done && <span className="nb-stamp">✓ DONE</span>}
                          <p style={{
                            fontWeight: 700, fontSize: 14, margin: 0,
                            color: done ? MUTED : TEXT, textDecoration: done ? 'line-through' : 'none',
                          }}>{sl.lessons?.title}</p>
                          {sl.lessons?.description && <p style={{ fontSize: 12, color: MUTED, margin: '5px 0 0', lineHeight: 1.4 }}>{sl.lessons.description}</p>}
                          {sl.lessons?.url && (
                            <a href={sl.lessons.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12, color: ACCENT, fontWeight: 700, margin: '8px 0 0', display: 'inline-block' }}>
                              Open ↗
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </Section>

            {/* Vocabulary training */}
            <Section tab="Vocabulary training" color={GRAY} icon="📚">
              {vocabCount === 0 ? (
                <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No words assigned yet — check back soon!</p>
              ) : (
                <Link to="/vocabulary" style={{ textDecoration: 'none' }}>
                  <div className="nb-shelf-card" style={{
                    background: LIGHT, border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 14,
                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{vocabCount} word{vocabCount === 1 ? '' : 's'} to study</p>
                      <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0' }}>Flashcards, quiz, matching, and a blast game.</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap' }}>▶ Start studying</span>
                  </div>
                </Link>
              )}
            </Section>

            {/* Feedback + Files */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 }}>
              <FeedbackSection feedback={feedback} />
              <FilesSection profile={profile} files={files} onUpdate={fetchData} />
            </div>

            {/* Suggest a lesson */}
            <SuggestSection profile={profile} suggestions={suggestions} onSent={fetchData} />
          </main>
        </div>
      </div>
    </div>
  )
}

/* ── Section wrapper with an index tab ── */
function Section({ tab, color, icon, children }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: color }}>
        <span>{icon}</span>{tab}
      </span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        {children}
      </div>
    </section>
  )
}

/* ── Feedback ── */
function FeedbackSection({ feedback }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span className="nb-tab" style={{ background: ACCENT }}><span>💬</span>Feedback</span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        {feedback.length === 0
          ? <p style={{ fontSize: 14, color: MUTED }}>No feedback yet.</p>
          : feedback.slice(0, 5).map(f => (
            <div key={f.id} className="nb-note" style={{ background: '#fdf6e3', borderRadius: 10, padding: '16px 16px 14px', marginBottom: 16, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: 0 }}>{f.content}</p>
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 16, fontWeight: 700, color: MUTED, margin: '6px 0 0' }}>
                — {new Date(f.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
          ))}
      </div>
    </div>
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
    <div style={{ marginBottom: 8 }}>
      <span className="nb-tab" style={{ background: SLATE }}><span>📎</span>Send a file</span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Homework, essays, audio recordings — docs, images, and audio up to {MAX_FILE_MB}MB.</p>

        <label className="nb-dropzone" style={{
          display: 'block', textAlign: 'center', padding: '16px', borderRadius: 12,
          border: '1.5px dashed rgba(0,0,0,0.2)', cursor: uploading ? 'default' : 'pointer',
          fontSize: 13, fontWeight: 700, color: uploading ? MUTED : SLATE, marginBottom: 14,
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
                  <p className="nb-mono" style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</p>
                  <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>{new Date(f.uploaded_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => removeFile(f)} style={{
                  background: 'none', border: 'none', color: '#d94f4f', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
    <div>
      <span className="nb-tab" style={{ background: PLUM }}><span>💡</span>Suggest a lesson</span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>A video, a movie, a song, specific vocabulary — anything you'd like to study next.</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {SUGGESTION_TYPES.map(t => (
            <button key={t} onClick={() => setSelected(t)} className="nb-chip" style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: selected === t ? PLUM : 'transparent',
              color: selected === t ? 'white' : TEXT,
              border: `1.5px solid ${selected === t ? PLUM : 'rgba(0,0,0,0.15)'}`,
            }}>{t}</button>
          ))}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Tell us more (title, link, topic…)" rows={2}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.1)', background: LIGHT, resize: 'none', boxSizing: 'border-box', color: TEXT }} />
        <button onClick={send} style={{
          marginTop: 10, padding: '12px 20px', borderRadius: 12, border: 'none',
          background: PLUM, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>{sent ? 'Sent! ✓' : '✈ Send to my tutor'}</button>

        {suggestions.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 16 }}>
            <p className="nb-mono" style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Sent suggestions</p>
            {suggestions.slice(0, 5).map(s => (
              <div key={s.id} style={{ background: LIGHT, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{s.content}</p>
                <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
