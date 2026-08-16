import { useCallback, useEffect, useRef, useState } from 'react'
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
const RUST = '#a8553f'

const FILE_ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav,.ogg'
const MAX_FILE_MB = 20
const MAX_RECORDING_SECONDS = 180
const MAX_AUDIO_MB = 15

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

            {/* Speaking practice */}
            <SpeakingSection profile={profile} />

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

/* ── Speaking practice ── */
function extFromMime(mime) {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function SpeakingSection({ profile }) {
  const [submissions, setSubmissions] = useState([])
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [pendingAudio, setPendingAudio] = useState(null)
  const [topic, setTopic] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const fetchSubmissions = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('audio_submissions')
      .select('*')
      .eq('student_id', profile.id)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
  }, [profile])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  useEffect(() => {
    if (!submissions.some(s => s.status === 'processing')) return
    const id = setInterval(fetchSubmissions, 4000)
    return () => clearInterval(id)
  }, [submissions, fetchSubmissions])

  useEffect(() => () => clearInterval(timerRef.current), [])

  function stopRecording() {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        if (blob.size < 3000) {
          setError('That recording was too short — hold record for a few seconds and speak before stopping.')
          return
        }
        setPendingAudio({ blob, url: URL.createObjectURL(blob), name: `recording.${extFromMime(blob.type)}` })
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            clearInterval(timerRef.current)
            mediaRecorderRef.current?.stop()
            setRecording(false)
            return MAX_RECORDING_SECONDS
          }
          return s + 1
        })
      }, 1000)
    } catch {
      setError('Could not access your microphone — check your browser permissions.')
    }
  }

  function handleFileChoice(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setError(`File too big — max ${MAX_AUDIO_MB}MB.`)
      return
    }
    setPendingAudio({ blob: file, url: URL.createObjectURL(file), name: file.name })
  }

  function discardPending() {
    if (pendingAudio) URL.revokeObjectURL(pendingAudio.url)
    setPendingAudio(null)
    setTopic('')
  }

  async function send() {
    if (!pendingAudio) return
    setSending(true)
    setError('')
    try {
      const path = `${profile.id}/${Date.now()}-${pendingAudio.name}`
      const { error: uploadError } = await supabase.storage.from('speaking-audio').upload(path, pendingAudio.blob)
      if (uploadError) throw uploadError

      const { data: row, error: insertError } = await supabase
        .from('audio_submissions')
        .insert({ student_id: profile.id, storage_path: path, topic: topic.trim() || null })
        .select()
        .single()
      if (insertError) throw insertError

      discardPending()
      fetchSubmissions()

      const { data: sessionData } = await supabase.auth.getSession()
      fetch('/.netlify/functions/evaluate-audio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId: row.id, accessToken: sessionData.session.access_token }),
      }).finally(fetchSubmissions)
    } catch {
      setError('Could not send audio. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function removeSubmission(s) {
    await supabase.storage.from('speaking-audio').remove([s.storage_path])
    await supabase.from('audio_submissions').delete().eq('id', s.id)
    fetchSubmissions()
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <span className="nb-tab" style={{ background: RUST }}><span>🎙️</span>Speaking practice</span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
          Record yourself speaking English (up to {MAX_RECORDING_SECONDS / 60} min) or upload a file — an AI gives you a first score and feedback right away, then Aimee reviews it.
        </p>

        {!pendingAudio ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={recording ? stopRecording : startRecording} style={{
              padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: recording ? '#d94f4f' : RUST, color: 'white', fontSize: 14, fontWeight: 700,
            }}>
              {recording ? `⏹ Stop (${formatTime(seconds)})` : '🎤 Record'}
            </button>
            <label className="nb-dropzone" style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px', borderRadius: 12,
              border: '1.5px dashed rgba(0,0,0,0.2)', cursor: recording ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, color: recording ? MUTED : RUST,
            }}>
              📎 Upload audio file
              <input type="file" accept="audio/*" onChange={handleFileChoice} disabled={recording} style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
          <div style={{ background: LIGHT, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={pendingAudio.url} style={{ width: '100%', marginBottom: 10 }} />
            <input
              value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="What are you talking about? (optional)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.1)', marginBottom: 10, boxSizing: 'border-box', color: TEXT }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={send} disabled={sending} style={{
                padding: '11px 18px', borderRadius: 10, border: 'none', cursor: sending ? 'default' : 'pointer',
                background: RUST, color: 'white', fontSize: 13, fontWeight: 700, opacity: sending ? 0.7 : 1,
              }}>{sending ? 'Sending…' : '✈ Send for feedback'}</button>
              <button onClick={discardPending} disabled={sending} style={{
                padding: '11px 18px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent', border: '1.5px solid rgba(0,0,0,0.15)', color: MUTED, fontSize: 13, fontWeight: 600,
              }}>Discard</button>
            </div>
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#d94f4f', margin: '0 0 12px' }}>{error}</p>}

        {submissions.length === 0 ? (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No recordings yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submissions.map(s => <SubmissionCard key={s.id} s={s} onRemove={() => removeSubmission(s)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function SubmissionCard({ s, onRemove }) {
  const [open, setOpen] = useState(false)
  const isFinal = s.reviewed_by_teacher
  const score = isFinal ? s.teacher_score : s.ai_score
  const badgeLabel = isFinal ? '✓ Feedback by Aimee' : '🤖 Feedback by AI · awaiting review'
  const badgeColor = isFinal ? OLIVE : SLATE

  return (
    <div style={{ background: LIGHT, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: 0 }}>{new Date(s.created_at).toLocaleDateString()}</p>
          {s.topic && <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: '3px 0 0' }}>{s.topic}</p>}
        </div>
        {s.status === 'done' && score != null && (
          <span style={{ background: badgeColor, color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {Number(score).toFixed(1)} / 10
          </span>
        )}
      </div>

      {s.status === 'processing' && <p style={{ fontSize: 13, color: MUTED, margin: '10px 0 0' }}>⏳ Processing your audio…</p>}

      {s.status === 'error' && (
        <p style={{ fontSize: 13, color: '#d94f4f', margin: '10px 0 0' }}>Something went wrong evaluating this audio — try recording it again.</p>
      )}

      {s.status === 'done' && (
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{badgeLabel}</span>
          <button onClick={() => setOpen(o => !o)} style={{
            display: 'block', marginTop: 6, background: 'none', border: 'none', color: ACCENT,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0,
          }}>
            {open ? 'Hide feedback ▲' : 'Show feedback ▼'}
          </button>
          {open && (isFinal
            ? <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>{s.teacher_feedback}</p>
            : <AIFeedbackDetail feedback={s.ai_feedback} />)}
        </div>
      )}

      {s.status !== 'processing' && (
        <button onClick={onRemove} style={{ marginTop: 10, background: 'none', border: 'none', color: MUTED, fontSize: 11, cursor: 'pointer', padding: 0 }}>Remove</button>
      )}
    </div>
  )
}

function AIFeedbackDetail({ feedback }) {
  if (!feedback) return null
  return (
    <div style={{ marginTop: 10, fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
      {feedback.reconstructed_intent && (
        <p style={{ margin: '0 0 10px' }}><strong>What you were trying to say:</strong> {feedback.reconstructed_intent}</p>
      )}
      {feedback.strengths?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <strong>✅ What went well</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{feedback.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {feedback.errors?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <strong>Corrections</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {feedback.errors.map((e, i) => <li key={i}>"{e.said}" → "{e.correct}" — {e.tip}</li>)}
          </ul>
        </div>
      )}
      {feedback.portuguese_gaps?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <strong>🇧🇷 Words you switched to Portuguese for</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {feedback.portuguese_gaps.map((g, i) => <li key={i}>{g.pt} → <em>{g.en}</em> — "{g.example}"</li>)}
          </ul>
        </div>
      )}
      {feedback.study_tips?.length > 0 && (
        <div>
          <strong>📚 Study tips</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{feedback.study_tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {feedback.score_reason && <p style={{ marginTop: 10, fontStyle: 'italic', color: MUTED }}>{feedback.score_reason}</p>}
    </div>
  )
}
