import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const OLIVE = '#8d9a55'
const ACCENT = '#c17c4a'
const TEXT = '#43492a'
const MUTED = '#6b7340'
const CREAM = '#eef0e0'
const DANGER = '#d94f4f'

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeStudents, setActiveStudents] = useState(new Set())
  const [tab, setTab] = useState('students') // students | classes | lessons

  const fetchAll = useCallback(async () => {
    const [{ data: st }, { data: cl }, { data: subs }, { data: prefs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('classes').select('*').eq('teacher_id', profile.id).order('name'),
      supabase.from('student_assignments').select('student_id, created_at').not('student_response', 'is', null).is('grade', null),
      supabase.from('feedback').select('student_id, created_at').eq('type', 'preference'),
    ])
    setStudents(st || [])
    setClasses(cl || [])

    const activityMap = {}
    for (const r of [...(subs || []), ...(prefs || [])]) {
      const ts = r.created_at
      if (!activityMap[r.student_id] || ts > activityMap[r.student_id]) activityMap[r.student_id] = ts
    }
    const unread = new Set(
      Object.entries(activityMap)
        .filter(([id, ts]) => {
          const last = localStorage.getItem(`student_read_${id}`)
          return !last || ts > last
        })
        .map(([id]) => id)
    )
    setActiveStudents(unread)
  }, [profile])

  useEffect(() => { fetchAll() }, [fetchAll])

  function openStudent(s) {
    localStorage.setItem(`student_read_${s.id}`, new Date().toISOString())
    setActiveStudents(prev => { const n = new Set(prev); n.delete(s.id); return n })
    setSelected(s)
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const firstName = profile?.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: TEXT, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: '#c2ca86', margin: 0 }}>
            Hi, {firstName}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(194,202,134,0.6)', margin: '3px 0 0' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Pill>{students.length} students</Pill>
          <Pill>{classes.length} classes</Pill>
          <button onClick={signOut} style={{ background: 'none', border: '1.5px solid rgba(194,202,134,0.3)', borderRadius: 20, padding: '7px 16px', fontSize: 13, color: 'rgba(194,202,134,0.7)', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '20px 32px 0', borderBottom: '1px solid rgba(67,73,42,0.1)' }}>
        {['students', 'classes', 'lessons'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 20px', borderRadius: '10px 10px 0 0', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? TEXT : MUTED,
            boxShadow: tab === t ? '0 -2px 8px rgba(0,0,0,0.05)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>
        {tab === 'students' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {students.map(s => (
              <StudentCard key={s.id} s={s} hasNew={activeStudents.has(s.id)} onClick={() => openStudent(s)} />
            ))}
            {students.length === 0 && <p style={{ color: MUTED, fontSize: 14 }}>No students yet.</p>}
          </div>
        )}

        {tab === 'classes' && (
          <ClassesTab classes={classes} teacherId={profile.id} students={students} onRefresh={fetchAll} />
        )}

        {tab === 'lessons' && (
          <LessonsTab classes={classes} />
        )}
      </div>

      {selected && (
        <StudentModal student={selected} classes={classes} onClose={() => setSelected(null)} onRefresh={fetchAll} />
      )}
    </div>
  )
}

function Pill({ children }) {
  return <div style={{ background: 'rgba(194,202,134,0.15)', borderRadius: 20, padding: '7px 14px', fontSize: 13, color: '#c2ca86', fontWeight: 500 }}>{children}</div>
}

function StudentCard({ s, hasNew, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'white', borderRadius: 16, padding: '18px 20px', cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)', position: 'relative',
      border: hasNew ? `2px solid ${DANGER}` : '2px solid transparent',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {hasNew && (
        <div style={{ position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: '50%', background: DANGER }} />
      )}
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: TEXT, marginBottom: 10 }}>
        {(s.full_name || s.email)?.[0]?.toUpperCase()}
      </div>
      <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{s.full_name || s.email}</p>
      <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>{s.email}</p>
    </div>
  )
}

/* ── Classes tab ── */
function ClassesTab({ classes, teacherId, students, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', schedule: '', description: '' })
  const [editId, setEditId] = useState(null)
  const [enrollments, setEnrollments] = useState([]) // all enrollments
  const [expandedClass, setExpandedClass] = useState(null)

  useEffect(() => { fetchEnrollments() }, [])

  async function fetchEnrollments() {
    const { data } = await supabase.from('class_enrollments').select('*')
    setEnrollments(data || [])
  }

  async function save() {
    if (!form.name.trim()) return
    if (editId) {
      await supabase.from('classes').update(form).eq('id', editId)
    } else {
      await supabase.from('classes').insert({ ...form, teacher_id: teacherId })
    }
    setForm({ name: '', schedule: '', description: '' })
    setEditId(null)
    setShowForm(false)
    onRefresh()
  }

  async function remove(id) {
    if (!confirm('Delete this class?')) return
    await supabase.from('classes').delete().eq('id', id)
    onRefresh()
  }

  function startEdit(c) {
    setForm({ name: c.name, schedule: c.schedule || '', description: c.description || '' })
    setEditId(c.id)
    setShowForm(true)
  }

  async function enroll(classId, studentId) {
    await supabase.from('class_enrollments').upsert({ class_id: classId, student_id: studentId }, { onConflict: 'student_id,class_id' })
    fetchEnrollments()
  }

  async function unenroll(classId, studentId) {
    await supabase.from('class_enrollments').delete().eq('class_id', classId).eq('student_id', studentId)
    fetchEnrollments()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Classes</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', schedule: '', description: '' }) }} style={addBtn}>+ New class</button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: '0 0 14px' }}>{editId ? 'Edit class' : 'New class'}</h3>
          <Field label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Tuesday Evening" />
          <Field label="Schedule" value={form.schedule} onChange={v => setForm(f => ({ ...f, schedule: v }))} placeholder="e.g. Tuesdays 8–9pm" />
          <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Notes about this class" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={save} style={addBtn}>Save</button>
            <button onClick={() => setShowForm(false)} style={cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {classes.length === 0 && <p style={{ fontSize: 14, color: MUTED }}>No classes yet.</p>}
        {classes.map(c => {
          const classEnrollments = enrollments.filter(e => e.class_id === c.id)
          const enrolledIds = new Set(classEnrollments.map(e => e.student_id))
          const isExpanded = expandedClass === c.id

          return (
            <div key={c.id} style={{ background: 'white', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: TEXT, margin: 0 }}>{c.name}</p>
                  {c.schedule && <p style={{ fontSize: 13, color: MUTED, margin: '3px 0 0' }}>{c.schedule}</p>}
                  {c.description && <p style={{ fontSize: 13, color: MUTED, margin: '3px 0 0' }}>{c.description}</p>}
                  <p style={{ fontSize: 12, color: OLIVE, margin: '6px 0 0', fontWeight: 600 }}>{classEnrollments.length} student{classEnrollments.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setExpandedClass(isExpanded ? null : c.id)} style={smallBtn}>
                    {isExpanded ? 'Hide students ↑' : 'Manage students ↓'}
                  </button>
                  <button onClick={() => startEdit(c)} style={smallBtn}>Edit</button>
                  <button onClick={() => remove(c.id)} style={{ ...smallBtn, color: DANGER }}>Delete</button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 16, borderTop: '1px solid rgba(67,73,42,0.1)', paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Students</p>
                  {students.map(s => {
                    const enrolled = enrolledIds.has(s.id)
                    return (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(67,73,42,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: TEXT }}>
                            {(s.full_name || s.email)?.[0]?.toUpperCase()}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0 }}>{s.full_name || s.email}</p>
                        </div>
                        {enrolled
                          ? <button onClick={() => unenroll(c.id, s.id)} style={{ ...smallBtn, color: DANGER }}>Remove</button>
                          : <button onClick={() => enroll(c.id, s.id)} style={addBtn}>Add</button>
                        }
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Lessons tab ── */
function LessonsTab({ classes }) {
  const [selectedClass, setSelectedClass] = useState('')
  const [lessons, setLessons] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [editId, setEditId] = useState(null)

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase.from('lessons').select('*').eq('class_id', selectedClass).order('created_at')
    setLessons(data || [])
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass) fetchLessons()
  }, [selectedClass, fetchLessons])

  async function save() {
    if (!form.title.trim() || !selectedClass) return
    if (editId) {
      await supabase.from('lessons').update(form).eq('id', editId)
    } else {
      await supabase.from('lessons').insert({ ...form, class_id: selectedClass })
    }
    setForm({ title: '', description: '' })
    setEditId(null)
    setShowForm(false)
    fetchLessons()
  }

  async function remove(id) {
    if (!confirm('Delete this lesson?')) return
    await supabase.from('lessons').delete().eq('id', id)
    fetchLessons()
  }

  function startEdit(l) {
    setForm({ title: l.title, description: l.description || '' })
    setEditId(l.id)
    setShowForm(true)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Lessons</h2>
        {selectedClass && <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '' }) }} style={addBtn}>+ New lesson</button>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 14, color: TEXT, background: 'white', cursor: 'pointer' }}>
          <option value="">Select a class…</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: '0 0 14px' }}>{editId ? 'Edit lesson' : 'New lesson'}</h3>
          <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Past tense verbs" />
          <Field label="Description (optional)" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="What will students practice?" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={save} style={addBtn}>Save</button>
            <button onClick={() => setShowForm(false)} style={cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {selectedClass && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lessons.length === 0 && <p style={{ fontSize: 14, color: MUTED }}>No lessons yet for this class.</p>}
          {lessons.map((l, i) => (
            <div key={l.id} style={{ background: 'white', borderRadius: 14, padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: MUTED, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: TEXT, margin: 0 }}>{l.title}</p>
                  {l.description && <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{l.description}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => startEdit(l)} style={smallBtn}>Edit</button>
                <button onClick={() => remove(l.id)} style={{ ...smallBtn, color: DANGER }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Student detail modal ── */
function StudentModal({ student, classes, onClose, onRefresh }) {
  const [tab, setTab] = useState('feedback')
  const [feedback, setFeedback] = useState([])
  const [assignments, setAssignments] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [preferences, setPreferences] = useState([])
  const [activities, setActivities] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [joinLink, setJoinLink] = useState(student.join_link || '')
  const [savingLink, setSavingLink] = useState(false)

  // feedback editing
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [newFeedback, setNewFeedback] = useState('')

  // class note
  const [noteClass, setNoteClass] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteSent, setNoteSent] = useState(false)

  // assignment form
  const [assignForm, setAssignForm] = useState({ title: '', description: '', due_date: '', class_id: '' })
  const [showAssignForm, setShowAssignForm] = useState(false)

  // activity slots (fixed 4)
  const ACTIVITY_SLOTS = [
    { key: 'vocabulary_match', name: 'Vocabulary Match', icon: '📋' },
    { key: 'listening_podcast', name: 'Listening Podcast', icon: '🎧' },
    { key: 'culture_quiz', name: 'Culture Quiz', icon: '🌎' },
    { key: 'grammar_sprint', name: 'Grammar Sprint', icon: '⚡' },
  ]

  // vocabulary form
  const [vocabForm, setVocabForm] = useState({ word: '', definition: '', example: '' })
  const [showVocabForm, setShowVocabForm] = useState(false)

  // seen tracking
  function getSeenIds() {
    try { return new Set(JSON.parse(localStorage.getItem(`seen_${student.id}`) || '[]')) } catch { return new Set() }
  }
  function markIdSeen(id) {
    const s = getSeenIds(); s.add(id)
    localStorage.setItem(`seen_${student.id}`, JSON.stringify([...s]))
  }
  function onItemSeen() { onRefresh() }

  const fetchStudentData = useCallback(async () => {
    const sid = student.id
    const [{ data: fb }, { data: sa }, { data: ce }, { data: act }, { data: sv }] = await Promise.all([
      supabase.from('feedback').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      supabase.from('student_assignments').select('*, assignments(*)').eq('student_id', sid),
      supabase.from('class_enrollments').select('*, classes(*)').eq('student_id', sid),
      supabase.from('student_activities').select('*').eq('student_id', sid).order('position'),
      supabase.from('student_vocabulary').select('*, vocabulary(*)').eq('student_id', sid).order('created_at'),
    ])
    const allFb = fb || []
    setFeedback(allFb.filter(f => f.type !== 'preference' && f.type !== 'class_note' && f.type !== 'student_activity'))
    setPreferences(allFb.filter(f => f.type === 'preference' || f.content?.startsWith('Preferred materials:')))
    setAssignments(sa || [])
    setEnrollments(ce || [])
    setActivities(act || [])
    setVocabulary(sv || [])
  }, [student.id])

  useEffect(() => { fetchStudentData() }, [fetchStudentData])

  async function addFeedback() {
    if (!newFeedback.trim()) return
    await supabase.from('feedback').insert({ student_id: student.id, content: newFeedback })
    setNewFeedback('')
    fetchStudentData()
  }

  async function saveEdit(id) {
    await supabase.from('feedback').update({ content: editText }).eq('id', id)
    setEditingId(null)
    fetchStudentData()
  }

  async function deleteFeedback(id) {
    await supabase.from('feedback').delete().eq('id', id)
    fetchStudentData()
  }

  async function sendClassNote() {
    if (!noteText.trim() || !noteClass) return
    await supabase.from('feedback').insert({ student_id: student.id, content: noteText, type: 'class_note', class_id: noteClass })
    setNoteText(''); setNoteSent(true)
    setTimeout(() => setNoteSent(false), 2000)
    fetchStudentData()
  }

  async function createAssignment() {
    if (!assignForm.title.trim()) return
    const { data: a } = await supabase.from('assignments').insert({
      title: assignForm.title, description: assignForm.description,
      due_date: assignForm.due_date || null, class_id: assignForm.class_id || null,
    }).select().single()
    if (a) await supabase.from('student_assignments').insert({ student_id: student.id, assignment_id: a.id, status: 'pending' })
    setAssignForm({ title: '', description: '', due_date: '', class_id: '' })
    setShowAssignForm(false)
    fetchStudentData()
  }

  async function saveJoinLink() {
    setSavingLink(true)
    await supabase.from('profiles').update({ join_link: joinLink }).eq('id', student.id)
    setSavingLink(false)
  }

  async function saveActivitySlot(key, name, icon, url) {
    const existing = activities.find(a => a.slot_key === key)
    if (existing) {
      await supabase.from('student_activities').update({ url: url || null }).eq('id', existing.id)
    } else {
      await supabase.from('student_activities').insert({ student_id: student.id, name, icon, url: url || null, slot_key: key, position: ACTIVITY_SLOTS.findIndex(s => s.key === key) })
    }
    fetchStudentData()
  }

  async function addVocab() {
    if (!vocabForm.word.trim()) return
    const { data: v } = await supabase.from('vocabulary').insert({
      word: vocabForm.word.trim(), definition: vocabForm.definition.trim(), example: vocabForm.example.trim() || null,
    }).select().single()
    if (v) await supabase.from('student_vocabulary').insert({ student_id: student.id, vocabulary_id: v.id, status: 'learning' })
    setVocabForm({ word: '', definition: '', example: '' })
    setShowVocabForm(false)
    fetchStudentData()
  }

  async function deleteVocab(svId, vocabId) {
    await supabase.from('student_vocabulary').delete().eq('id', svId)
    await supabase.from('vocabulary').delete().eq('id', vocabId)
    fetchStudentData()
  }

  async function enrollInClass(classId) {
    await supabase.from('class_enrollments').upsert({ student_id: student.id, class_id: classId }, { onConflict: 'student_id,class_id' })
    fetchStudentData()
  }

  async function unenroll(enrollmentId) {
    await supabase.from('class_enrollments').delete().eq('id', enrollmentId)
    fetchStudentData()
  }

  const TABS = ['feedback', 'class note', 'assignments', 'vocabulary', 'activities', 'join link', 'preferences', 'classes']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Modal header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(67,73,42,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>{student.full_name || student.email}</h2>
              <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>{student.email}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: MUTED, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 1 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap',
                background: tab === t ? CREAM : 'transparent',
                color: tab === t ? TEXT : MUTED,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Feedback */}
          {tab === 'feedback' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <textarea value={newFeedback} onChange={e => setNewFeedback(e.target.value)} rows={3} placeholder="Write feedback for this student…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(67,73,42,0.2)', resize: 'none', color: TEXT, boxSizing: 'border-box' }} />
                <button onClick={addFeedback} style={{ ...addBtn, marginTop: 8 }}>Add feedback</button>
              </div>
              {feedback.length === 0 && <p style={{ fontSize: 14, color: MUTED }}>No feedback yet.</p>}
              {feedback.map(f => (
                <FeedbackItem key={f.id} f={f} editingId={editingId} editText={editText}
                  onEdit={() => { setEditingId(f.id); setEditText(f.content) }}
                  onEditChange={setEditText} onSaveEdit={() => saveEdit(f.id)}
                  onCancelEdit={() => setEditingId(null)} onDelete={() => deleteFeedback(f.id)} />
              ))}
            </div>
          )}

          {/* Class note */}
          {tab === 'class note' && (
            <div>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>This note will appear in the student's Lessons section.</p>
              <select value={noteClass} onChange={e => setNoteClass(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 14, color: TEXT, marginBottom: 10 }}>
                <option value="">Select class…</option>
                {enrollments.map(ce => <option key={ce.id} value={ce.classes?.id}>{ce.classes?.name}</option>)}
              </select>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Write a note for this session…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid rgba(67,73,42,0.2)', resize: 'none', color: TEXT, boxSizing: 'border-box', marginBottom: 10 }} />
              <button onClick={sendClassNote} style={addBtn}>{noteSent ? 'Sent! ✓' : 'Send note'}</button>
            </div>
          )}

          {/* Assignments */}
          {tab === 'assignments' && (
            <div>
              <button onClick={() => setShowAssignForm(x => !x)} style={{ ...addBtn, marginBottom: 14 }}>+ New assignment</button>
              {showAssignForm && (
                <div style={{ background: CREAM, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                  <Field label="Title" value={assignForm.title} onChange={v => setAssignForm(f => ({ ...f, title: v }))} placeholder="Assignment title" />
                  <Field label="Description" value={assignForm.description} onChange={v => setAssignForm(f => ({ ...f, description: v }))} placeholder="Instructions" />
                  <Field label="Due date" value={assignForm.due_date} onChange={v => setAssignForm(f => ({ ...f, due_date: v }))} type="date" />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={createAssignment} style={addBtn}>Save</button>
                    <button onClick={() => setShowAssignForm(false)} style={cancelBtn}>Cancel</button>
                  </div>
                </div>
              )}
              {assignments.length === 0 && <p style={{ fontSize: 14, color: MUTED }}>No assignments yet.</p>}
              {assignments.map(sa => {
                const seen = getSeenIds().has(sa.id)
                return (
                  <div key={sa.id} style={{ background: CREAM, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, color: TEXT, margin: 0 }}>{sa.assignments?.title || '(Untitled)'}</p>
                        {sa.assignments?.description && <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>{sa.assignments.description}</p>}
                        {sa.assignments?.due_date && <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>Due: {new Date(sa.assignments.due_date).toLocaleDateString()}</p>}
                        <p style={{ fontSize: 12, margin: '6px 0 0', fontWeight: 600, color: sa.status === 'completed' ? OLIVE : ACCENT }}>
                          {sa.status === 'completed' ? '✓ Completed' : 'Pending'}
                        </p>
                        {sa.student_response && (
                          <div style={{ marginTop: 8, background: 'white', borderRadius: 8, padding: '8px 10px' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Student response</p>
                            <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{sa.student_response}</p>
                          </div>
                        )}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                        <input type="checkbox" checked={seen} onChange={() => { markIdSeen(sa.id); onItemSeen() }} />
                        <span style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap' }}>Evaluated</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Vocabulary */}
          {tab === 'vocabulary' && (
            <div>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Words assigned here appear in the student's Vocabulary Match activity.</p>
              <button onClick={() => setShowVocabForm(x => !x)} style={{ ...addBtn, marginBottom: 14 }}>+ Add word</button>
              {showVocabForm && (
                <div style={{ background: CREAM, borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                  <Field label="Word" value={vocabForm.word} onChange={v => setVocabForm(f => ({ ...f, word: v }))} placeholder="e.g. ambitious" />
                  <Field label="Definition" value={vocabForm.definition} onChange={v => setVocabForm(f => ({ ...f, definition: v }))} placeholder="e.g. Having a strong desire to succeed" />
                  <Field label="Example sentence (optional)" value={vocabForm.example} onChange={v => setVocabForm(f => ({ ...f, example: v }))} placeholder="e.g. She is an ambitious student." />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={addVocab} style={addBtn}>Save</button>
                    <button onClick={() => setShowVocabForm(false)} style={cancelBtn}>Cancel</button>
                  </div>
                </div>
              )}
              {vocabulary.length === 0 && <p style={{ fontSize: 14, color: MUTED }}>No vocabulary assigned yet.</p>}
              {vocabulary.map(sv => (
                <div key={sv.id} style={{ background: CREAM, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{sv.vocabulary?.word}</p>
                      <p style={{ fontSize: 13, color: MUTED, margin: '3px 0 0' }}>{sv.vocabulary?.definition}</p>
                      {sv.vocabulary?.example && <p style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', margin: '3px 0 0' }}>"{sv.vocabulary.example}"</p>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: sv.status === 'mastered' ? OLIVE : ACCENT, marginTop: 4, display: 'block' }}>
                        {sv.status === 'mastered' ? '✓ Mastered' : 'Learning'}
                      </span>
                    </div>
                    <button onClick={() => deleteVocab(sv.id, sv.vocabulary_id)} style={{ ...smallBtn, color: DANGER, flexShrink: 0 }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Activities */}
          {tab === 'activities' && (
            <div>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 18 }}>Assign a link for each activity. Students will see clickable cards on their dashboard.</p>
              {ACTIVITY_SLOTS.map(slot => {
                const existing = activities.find(a => a.slot_key === slot.key)
                return (
                  <ActivitySlot key={slot.key} slot={slot} existing={existing} onSave={saveActivitySlot} />
                )
              })}
            </div>
          )}

          {/* Join link */}
          {tab === 'join link' && (
            <div>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>This link will show as a "Join class" button on the student's dashboard.</p>
              <Field label="Google Meet / Zoom link" value={joinLink} onChange={setJoinLink} placeholder="https://meet.google.com/…" />
              <button onClick={saveJoinLink} disabled={savingLink} style={addBtn}>
                {savingLink ? 'Saving…' : 'Save link'}
              </button>
            </div>
          )}

          {/* Preferences */}
          {tab === 'preferences' && (
            <div>
              {preferences.length === 0
                ? <p style={{ fontSize: 14, color: MUTED }}>No preferences sent yet.</p>
                : preferences.map(p => {
                  const parts = p.content.split('. Notes: ')
                  const materials = parts[0].replace('Preferred materials: ', '').split(', ')
                  const note = parts[1] || null
                  const seen = getSeenIds().has(p.id)
                  return (
                    <div key={p.id} style={{ background: CREAM, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                          {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={seen} onChange={() => { markIdSeen(p.id); onItemSeen() }} />
                          <span style={{ fontSize: 11, color: MUTED }}>Mark seen</span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: note ? 10 : 0 }}>
                        {materials.map(m => <span key={m} style={{ padding: '5px 12px', borderRadius: 20, background: TEXT, color: '#c2ca86', fontSize: 12, fontWeight: 600 }}>{m}</span>)}
                      </div>
                      {note && <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.5, fontStyle: 'italic', margin: 0 }}>"{note}"</p>}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Classes / enrollment */}
          {tab === 'classes' && (
            <div>
              <p style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Enroll this student in your classes.</p>
              {classes.map(c => {
                const enrolled = enrollments.find(e => e.class_id === c.id)
                return (
                  <div key={c.id} style={{ background: CREAM, borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: TEXT, margin: 0 }}>{c.name}</p>
                      {c.schedule && <p style={{ fontSize: 12, color: MUTED, margin: '2px 0 0' }}>{c.schedule}</p>}
                    </div>
                    {enrolled
                      ? <button onClick={() => unenroll(enrolled.id)} style={{ ...smallBtn, color: DANGER }}>Remove</button>
                      : <button onClick={() => enrollInClass(c.id)} style={addBtn}>Enroll</button>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Activity slot ── */
function ActivitySlot({ slot, existing, onSave }) {
  const [url, setUrl] = useState(existing?.url || '')
  useEffect(() => { setUrl(existing?.url || '') }, [existing?.url])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(slot.key, slot.name, slot.icon, url)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: CREAM, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{slot.icon}</span>
        <p style={{ fontWeight: 600, fontSize: 14, color: TEXT, margin: 0 }}>{slot.name}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 13, color: TEXT, background: 'white' }} />
        <button onClick={save} disabled={saving} style={addBtn}>
          {saved ? '✓ Saved' : saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ── Feedback item ── */
function FeedbackItem({ f, editingId, editText, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete }) {
  const isEditing = editingId === f.id
  return (
    <div style={{ background: CREAM, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      {isEditing ? (
        <>
          <textarea value={editText} onChange={e => onEditChange(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1.5px solid rgba(67,73,42,0.2)', resize: 'none', color: TEXT, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={onSaveEdit} style={addBtn}>Save</button>
            <button onClick={onCancelEdit} style={cancelBtn}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: TEXT, margin: 0 }}>{f.content}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{new Date(f.created_at).toLocaleDateString()}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onEdit} style={smallBtn}>Edit</button>
              <button onClick={onDelete} style={{ ...smallBtn, color: DANGER }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Field ── */
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 13, color: TEXT, background: 'white', boxSizing: 'border-box' }} />
    </div>
  )
}

const addBtn = { padding: '9px 18px', borderRadius: 10, border: 'none', background: TEXT, color: '#c2ca86', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const cancelBtn = { padding: '9px 18px', borderRadius: 10, border: '1.5px solid rgba(67,73,42,0.2)', background: 'transparent', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const smallBtn = { padding: '5px 12px', borderRadius: 8, border: '1.5px solid rgba(67,73,42,0.15)', background: 'transparent', color: MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
