import { useCallback, useEffect, useState } from 'react'
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
const DANGER = '#d94f4f'

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const [students, setStudents] = useState([])
  const [unread, setUnread] = useState(new Set())
  const [selected, setSelected] = useState(null)

  const fetchStudents = useCallback(async () => {
    const [{ data: st }, { data: files }, { data: suggestions }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('student_files').select('student_id, uploaded_at'),
      supabase.from('feedback').select('student_id, created_at').eq('type', 'suggestion'),
    ])
    setStudents(st || [])

    const latest = {}
    for (const r of [...(files || []), ...(suggestions || [])]) {
      const ts = r.uploaded_at || r.created_at
      if (!latest[r.student_id] || ts > latest[r.student_id]) latest[r.student_id] = ts
    }
    const dots = new Set(
      Object.entries(latest)
        .filter(([id, ts]) => {
          const last = localStorage.getItem(`teacher_read_${id}`)
          return !last || ts > last
        })
        .map(([id]) => id)
    )
    setUnread(dots)
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  function openStudent(s) {
    localStorage.setItem(`teacher_read_${s.id}`, new Date().toISOString())
    setUnread(prev => { const n = new Set(prev); n.delete(s.id); return n })
    setSelected(s)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Teacher'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Hero cover ── */}
      <div className="nb-hero" style={{ padding: '54px 32px 64px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
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
                Teacher's Dashboard
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
            <span className="nb-mono" style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              color: '#e3d9c8', border: '1.5px solid rgba(255,255,255,0.22)',
            }}>{students.length} STUDENT{students.length === 1 ? '' : 'S'}</span>
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
        <div style={{ position: 'relative', width: '100%', maxWidth: 1000 }}>

          <div className="nb-spiral">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="nb-ring" />)}
          </div>

          <main className="nb-page" style={{ padding: '40px 8px 60px 36px' }}>
            <div className="nb-margin-line" />

            {selected
              ? <StudentEditor student={selected} onBack={() => { setSelected(null); fetchStudents() }} />
              : (
                <section>
                  <span className="nb-tab" style={{ background: OLIVE }}><span>🎓</span>Students</span>
                  <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
                    {students.length === 0 ? (
                      <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No students yet.</p>
                    ) : (
                      <div className="nb-shelf">
                        {students.map(s => (
                          <div key={s.id} onClick={() => openStudent(s)} className="nb-shelf-card" style={{
                            background: LIGHT, border: '1.5px solid rgba(0,0,0,0.06)',
                            borderRadius: 14, padding: '18px 16px',
                          }}>
                            {unread.has(s.id) && <span className="nb-unread-dot" />}
                            <div style={{
                              width: 42, height: 42, borderRadius: '50%', background: '#d4c4b5',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 16, color: '#5c4a3a', marginBottom: 10,
                            }}>{(s.full_name || s.email)?.[0]?.toUpperCase()}</div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{s.full_name || s.email}</p>
                            <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>{s.email}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ── Student editor ── */
function StudentEditor({ student, onBack }) {
  const [lessons, setLessons] = useState([])
  const [feedback, setFeedback] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [files, setFiles] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [joinLink, setJoinLink] = useState(student.join_link || '')
  const [savingLink, setSavingLink] = useState(false)
  const [linkSaved, setLinkSaved] = useState(false)

  const fetchAll = useCallback(async () => {
    const sid = student.id
    const [{ data: sl }, { data: fb }, { data: sf }, { data: sv }] = await Promise.all([
      supabase.from('student_lessons').select('*, lessons(*)').eq('student_id', sid),
      supabase.from('feedback').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      supabase.from('student_files').select('*').eq('student_id', sid).order('uploaded_at', { ascending: false }),
      supabase.from('student_vocabulary').select('*, vocabulary(*)').eq('student_id', sid),
    ])
    setLessons(sl || [])
    const allFb = fb || []
    setFeedback(allFb.filter(f => f.type !== 'preference' && f.type !== 'suggestion'))
    setSuggestions(allFb.filter(f => f.type === 'suggestion'))
    setFiles(sf || [])
    setVocabulary(sv || [])
  }, [student.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveJoinLink() {
    setSavingLink(true)
    await supabase.from('profiles').update({ join_link: joinLink }).eq('id', student.id)
    setSavingLink(false)
    setLinkSaved(true)
    setTimeout(() => setLinkSaved(false), 2000)
  }

  async function removeLesson(studentLessonId, lessonId) {
    await supabase.from('student_lessons').delete().eq('id', studentLessonId)
    await supabase.from('lessons').delete().eq('id', lessonId)
    fetchAll()
  }

  async function removeVocab(svId, vocabId) {
    await supabase.from('student_vocabulary').delete().eq('id', svId)
    await supabase.from('vocabulary').delete().eq('id', vocabId)
    fetchAll()
  }

  async function downloadFile(f) {
    const { data } = await supabase.storage.from('student-files').createSignedUrl(f.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteFile(f) {
    await supabase.storage.from('student-files').remove([f.storage_path])
    await supabase.from('student_files').delete().eq('id', f.id)
    fetchAll()
  }

  return (
    <div>
      <p className="nb-back nb-mono" onClick={onBack} style={{ fontSize: 13, fontWeight: 700, color: MUTED, margin: '0 0 20px' }}>
        ← Back to students
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: '#d4c4b5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18, color: '#5c4a3a',
        }}>{(student.full_name || student.email)?.[0]?.toUpperCase()}</div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 20, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>{student.full_name || student.email}</p>
          <p className="nb-mono" style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{student.email}</p>
        </div>
      </div>

      {/* Join link */}
      <section style={{ marginBottom: 30 }}>
        <span className="nb-tab" style={{ background: SLATE }}><span>🎥</span>Join link</span>
        <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinLink} onChange={e => setJoinLink(e.target.value)} placeholder="https://meet.google.com/…"
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.15)', fontSize: 13, color: TEXT }} />
            <button onClick={saveJoinLink} disabled={savingLink} style={addBtn}>
              {linkSaved ? '✓ Saved' : savingLink ? '…' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* Extra activities */}
      <section style={{ marginBottom: 30 }}>
        <span className="nb-tab" style={{ background: OLIVE }}><span>📌</span>Extra activities</span>
        <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <NewLessonForm studentId={student.id} onCreated={fetchAll} />
          {lessons.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No activities assigned yet.</p>
          ) : (
            <div className="nb-shelf">
              {lessons.map(sl => (
                <div key={sl.id} className="nb-shelf-card nb-static" style={{
                  background: LIGHT, border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '16px 16px 18px',
                }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{sl.lessons?.title}</p>
                  {sl.lessons?.description && <p style={{ fontSize: 12, color: MUTED, margin: '5px 0 0', lineHeight: 1.4 }}>{sl.lessons.description}</p>}
                  {sl.lessons?.url && <p className="nb-mono" style={{ fontSize: 11, color: ACCENT, margin: '8px 0 0', wordBreak: 'break-all' }}>{sl.lessons.url}</p>}
                  <button onClick={() => removeLesson(sl.id, sl.lesson_id)} style={{ ...smallBtn, marginTop: 10, color: DANGER }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Vocabulary */}
      <section style={{ marginBottom: 30 }}>
        <span className="nb-tab" style={{ background: GRAY }}><span>📚</span>Vocabulary</span>
        <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          <NewVocabForm studentId={student.id} onCreated={fetchAll} />
          {vocabulary.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No words assigned yet.</p>
          ) : (
            <div className="nb-shelf">
              {vocabulary.map(sv => (
                <div key={sv.id} className="nb-shelf-card nb-static" style={{
                  background: LIGHT, border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '16px 16px 18px',
                }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{sv.vocabulary?.word}</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: '5px 0 0', lineHeight: 1.4 }}>{sv.vocabulary?.definition}</p>
                  {sv.vocabulary?.example && <p style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', margin: '5px 0 0' }}>"{sv.vocabulary.example}"</p>}
                  <button onClick={() => removeVocab(sv.id, sv.vocabulary_id)} style={{ ...smallBtn, marginTop: 10, color: DANGER }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Feedback */}
      <section style={{ marginBottom: 30 }}>
        <FeedbackEditor studentId={student.id} feedback={feedback} onUpdate={fetchAll} />
      </section>

      {/* Files */}
      <section style={{ marginBottom: 30 }}>
        <span className="nb-tab" style={{ background: SLATE }}><span>📎</span>Files</span>
        <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          {files.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No files sent yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: LIGHT, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="nb-mono" style={{ fontSize: 12, fontWeight: 700, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</p>
                    <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>{new Date(f.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => downloadFile(f)} style={smallBtn}>Download</button>
                    <button onClick={() => deleteFile(f)} style={{ ...smallBtn, color: DANGER }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Suggestions */}
      <section>
        <span className="nb-tab" style={{ background: PLUM }}><span>💡</span>Suggestions</span>
        <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
          {suggestions.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No suggestions sent yet.</p>
          ) : (
            suggestions.map(s => (
              <div key={s.id} style={{ background: LIGHT, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{s.content}</p>
                <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>{new Date(s.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

/* ── New lesson form ── */
function NewLessonForm({ studentId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', url: '' })

  async function create() {
    if (!form.title.trim()) return
    const { data: l } = await supabase.from('lessons').insert({
      title: form.title.trim(), description: form.description.trim() || null, url: form.url.trim() || null,
    }).select().single()
    if (l) await supabase.from('student_lessons').insert({ student_id: studentId, lesson_id: l.id, status: 'pending' })
    setForm({ title: '', description: '', url: '' })
    setOpen(false)
    onCreated()
  }

  if (!open) return <button onClick={() => setOpen(true)} style={{ ...addBtn, marginBottom: 16 }}>+ New activity</button>

  return (
    <div style={{ background: LIGHT, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Past tense verbs" />
      <Field label="Description (optional)" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What will the student practice?" />
      <Field label="Link (optional)" value={form.url} onChange={v => setForm(f => ({ ...f, url: v }))} placeholder="https://…" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={create} style={addBtn}>Save</button>
        <button onClick={() => setOpen(false)} style={cancelBtn}>Cancel</button>
      </div>
    </div>
  )
}

/* ── New vocabulary word form ── */
function NewVocabForm({ studentId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ word: '', definition: '', example: '' })

  async function create() {
    if (!form.word.trim() || !form.definition.trim()) return
    const { data: v } = await supabase.from('vocabulary').insert({
      word: form.word.trim(), definition: form.definition.trim(), example: form.example.trim() || null,
    }).select().single()
    if (v) await supabase.from('student_vocabulary').insert({ student_id: studentId, vocabulary_id: v.id, status: 'learning' })
    setForm({ word: '', definition: '', example: '' })
    setOpen(false)
    onCreated()
  }

  if (!open) return <button onClick={() => setOpen(true)} style={{ ...addBtn, marginBottom: 16 }}>+ New word</button>

  return (
    <div style={{ background: LIGHT, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Field label="Word" value={form.word} onChange={v => setForm(f => ({ ...f, word: v }))} placeholder="e.g. ambitious" />
      <Field label="Definition" value={form.definition} onChange={v => setForm(f => ({ ...f, definition: v }))} placeholder="e.g. Having a strong desire to succeed" />
      <Field label="Example sentence (optional)" value={form.example} onChange={v => setForm(f => ({ ...f, example: v }))} placeholder="e.g. She is an ambitious student." />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={create} style={addBtn}>Save</button>
        <button onClick={() => setOpen(false)} style={cancelBtn}>Cancel</button>
      </div>
    </div>
  )
}

/* ── Feedback editor (mirrors the student's sticky-note look) ── */
function FeedbackEditor({ studentId, feedback, onUpdate }) {
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  async function add() {
    if (!text.trim()) return
    await supabase.from('feedback').insert({ student_id: studentId, content: text.trim() })
    setText('')
    onUpdate()
  }

  async function saveEdit(id) {
    await supabase.from('feedback').update({ content: editText }).eq('id', id)
    setEditingId(null)
    onUpdate()
  }

  async function remove(id) {
    await supabase.from('feedback').delete().eq('id', id)
    onUpdate()
  }

  return (
    <>
      <span className="nb-tab" style={{ background: ACCENT }}><span>💬</span>Feedback</span>
      <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Write feedback for this student…"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.15)', resize: 'none', color: TEXT, boxSizing: 'border-box', marginBottom: 8 }} />
        <button onClick={add} style={{ ...addBtn, marginBottom: 18 }}>Add feedback</button>

        {feedback.length === 0 && <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>No feedback yet.</p>}
        {feedback.map(f => {
          const isEditing = editingId === f.id
          return (
            <div key={f.id} className="nb-note" style={{ background: '#fdf6e3', borderRadius: 10, padding: '16px 16px 14px', marginBottom: 16, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}>
              {isEditing ? (
                <>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1.5px solid rgba(0,0,0,0.15)', resize: 'none', color: TEXT, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveEdit(f.id)} style={addBtn}>Save</button>
                    <button onClick={() => setEditingId(null)} style={cancelBtn}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: 0 }}>{f.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: 0 }}>{new Date(f.created_at).toLocaleDateString()}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditingId(f.id); setEditText(f.content) }} style={smallBtn}>Edit</button>
                      <button onClick={() => remove(f.id)} style={{ ...smallBtn, color: DANGER }}>Delete</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Field ── */
function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.15)', fontSize: 13, color: TEXT, background: 'white', boxSizing: 'border-box' }} />
    </div>
  )
}

const addBtn = { padding: '9px 18px', borderRadius: 10, border: 'none', background: ACCENT, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const cancelBtn = { padding: '9px 18px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const smallBtn = { padding: '5px 12px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
