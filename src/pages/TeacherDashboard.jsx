import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import FormField from '../components/FormField'

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('students')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [activeStudents, setActiveStudents] = useState(new Set())

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: s }, { data: c }, { data: a }, { data: v }, { data: sa }, { data: fb }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('assignments').select('*, classes(name)').order('created_at', { ascending: false }),
      supabase.from('vocabulary').select('*').order('word'),
      supabase.from('student_assignments').select('id, student_id').not('student_response', 'is', null),
      supabase.from('feedback').select('id, student_id').in('type', ['preference', 'student_activity']),
    ])
    setStudents(s || [])
    setClasses(c || [])
    setAssignments(a || [])
    setVocabulary(v || [])
    recomputeBadges(sa || [], fb || [])
  }

  function recomputeBadges(submissions, feedbackItems) {
    const seen = getSeenIds()
    const unread = new Set()
    for (const r of [...submissions, ...feedbackItems]) {
      if (!seen.has(r.id)) unread.add(r.student_id)
    }
    setActiveStudents(unread)
  }

  const tabs = ['students', 'classes', 'assignments', 'vocabulary']
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--card-cream)', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px 20px', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--card-green)', fontSize: 20, flexShrink: 0 }}>
            {(profile?.full_name || 'T')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineHeight: 1.1 }}>
              Hi, {profile?.full_name?.split(' ')[0] || 'Teacher'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '3px 0 0' }}>Here's your classroom, all in one place.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pill>{today}</Pill>
          <Pill>{students.length} students · {assignments.length} assignments</Pill>
          <button onClick={signOut} style={{ background: 'none', border: '1.5px solid rgba(67,73,42,0.2)', borderRadius: 20, padding: '7px 16px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 32px 24px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '9px 22px', borderRadius: 20, border: 'none', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
            background: activeTab === tab ? 'var(--text-dark)' : 'white',
            color: activeTab === tab ? 'var(--card-green)' : 'var(--text-muted)',
            boxShadow: activeTab === tab ? 'none' : '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 32px' }}>
        {activeTab === 'students' && <StudentsTab students={students} classes={classes} activeStudents={activeStudents} onRefresh={fetchAll} />}
        {activeTab === 'classes' && <ClassesTab classes={classes} students={students} onRefresh={fetchAll} />}
        {activeTab === 'assignments' && <AssignmentsTab assignments={assignments} classes={classes} students={students} onRefresh={fetchAll} />}
        {activeTab === 'vocabulary' && <VocabularyTab vocabulary={vocabulary} students={students} onRefresh={fetchAll} />}
      </div>
    </div>
  )
}

function Pill({ children }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '8px 16px', fontSize: 13, color: 'var(--text-dark)', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      {children}
    </div>
  )
}

function Panel({ children, style }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', ...style }}>
      {children}
    </div>
  )
}

// ── Students Tab ──────────────────────────────────────────────────────────────

function StudentsTab({ students, classes, activeStudents, onRefresh }) {
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function deleteStudent() {
    if (!confirmDelete) return
    setDeleting(true)
    await supabase.from('profiles').delete().eq('id', confirmDelete.id)
    setConfirmDelete(null)
    setDeleting(false)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={sectionTitle}>All Students ({students.length})</h2>
      </div>

      {confirmDelete && (
        <Modal title="Remove student?" onClose={() => setConfirmDelete(null)}>
          <p style={{ fontSize: 14, color: 'var(--text-dark)', marginBottom: 8 }}>
            Are you sure you want to remove <strong>{confirmDelete.full_name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            This will delete their profile and all associated data. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ ...addBtn, flex: 1, background: 'rgba(67,73,42,0.1)', color: 'var(--text-dark)' }}>Cancel</button>
            <button onClick={deleteStudent} disabled={deleting} style={{ ...addBtn, flex: 1, background: 'var(--danger)', color: 'white', opacity: deleting ? 0.6 : 1 }}>
              {deleting ? 'Removing...' : 'Yes, remove'}
            </button>
          </div>
        </Modal>
      )}

      <div style={gridStyle}>
        {students.length === 0 && (
          <Panel><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students yet. Students appear here after they sign up.</p></Panel>
        )}
        {students.map(s => (
          <StudentCard key={s.id} student={s} hasNew={activeStudents.has(s.id)} onClick={() => setSelected(s)} onDelete={s => setConfirmDelete(s)} />
        ))}
      </div>

      {selected && <StudentDetailModal student={selected} classes={classes}
        onItemSeen={() => {
          setActiveStudents(prev => { const next = new Set(prev); next.delete(selected.id); return next })
        }}
        onClose={() => { setSelected(null); onRefresh() }} />}
    </div>
  )
}

function StudentCard({ student, hasNew, onClick, onDelete }) {
  return (
    <Panel>
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--card-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text-dark)', fontSize: 17 }}>
              {(student.full_name || student.email)?.[0]?.toUpperCase() || '?'}
            </div>
            {hasNew && (
              <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--danger)', border: '2px solid white' }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>{student.full_name || student.email?.split('@')[0]}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{student.email}</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Joined {new Date(student.created_at).toLocaleDateString()}</p>
        <p style={{ fontSize: 12, color: 'var(--card-olive)', marginTop: 6, fontWeight: 600 }}>View details →</p>
      </div>
      <div style={{ borderTop: '1px solid rgba(67,73,42,0.08)', marginTop: 14, paddingTop: 12 }}>
        <button onClick={e => { e.stopPropagation(); onDelete(student) }} style={{ ...smallBtn, color: 'var(--danger)', width: '100%' }}>
          Remove student
        </button>
      </div>
    </Panel>
  )
}

function StudentDetailModal({ student, classes, onItemSeen, onClose }) {
  const [feedbackText, setFeedbackText] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [assignments, setAssignments] = useState([])
  const [vocabulary, setVocabulary] = useState([])
  const [studentFeedback, setStudentFeedback] = useState([])
  const [preferences, setPreferences] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [tab, setTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    loadAll()
  }, [student.id])

  async function loadAll() {
    const [{ data: sa }, { data: sv }, { data: fb }, { data: ce }] = await Promise.all([
      supabase.from('student_assignments').select('*, assignments(*)').eq('student_id', student.id),
      supabase.from('student_vocabulary').select('*, vocabulary(*)').eq('student_id', student.id),
      supabase.from('feedback').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('class_enrollments').select('*, classes(*)').eq('student_id', student.id),
    ])
    setAssignments(sa || [])
    setVocabulary(sv || [])
    splitFeedback(fb || [])
    setEnrollments(ce || [])
  }

  function splitFeedback(all) {
    setStudentFeedback(all.filter(f => f.type !== 'preference' && f.type !== 'class_note'))
    setPreferences(all.filter(f => f.type === 'preference' || f.content?.startsWith('Preferred materials:')))
  }

  async function reloadFeedback() {
    const { data } = await supabase.from('feedback').select('*').eq('student_id', student.id).order('created_at', { ascending: false })
    splitFeedback(data || [])
  }

  async function postFeedback(e) {
    e.preventDefault()
    if (!feedbackText.trim()) return
    setSaving(true)
    const payload = { student_id: student.id, content: feedbackText.trim() }
    if (selectedClassId) { payload.type = 'class_note'; payload.class_id = selectedClassId }
    await supabase.from('feedback').insert(payload)
    setFeedbackText('')
    setSelectedClassId('')
    await reloadFeedback()
    setSaving(false)
  }

  async function deleteFeedback(id) {
    await supabase.from('feedback').delete().eq('id', id)
    await reloadFeedback()
  }

  async function saveEdit(id) {
    await supabase.from('feedback').update({ content: editText }).eq('id', id)
    setEditingId(null)
    await reloadFeedback()
  }

  async function updateAssignment(id, updates) {
    await supabase.from('student_assignments').update(updates).eq('id', id)
    const { data } = await supabase.from('student_assignments').select('*, assignments(*)').eq('student_id', student.id)
    setAssignments(data || [])
  }

  const tabs = ['info', 'feedback', 'class notes', 'preferences', 'assignments', 'vocabulary', 'classes']

  return (
    <Modal title={student.full_name || student.email} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{student.email}</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600,
            background: tab === t ? 'var(--text-dark)' : 'rgba(67,73,42,0.08)',
            color: tab === t ? 'var(--card-green)' : 'var(--text-dark)',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'preferences' && preferences.length > 0 && (
              <span style={{ marginLeft: 5, background: 'var(--card-olive)', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{preferences.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InfoRow label="Joined" value={new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          <InfoRow label="Classes" value={enrollments.length} />
          <InfoRow label="Assignments" value={assignments.length} />
          <InfoRow label="Vocabulary words" value={vocabulary.length} />
          <InfoRow label="Words mastered" value={vocabulary.filter(v => v.status === 'mastered').length} />
        </div>
      )}

      {tab === 'feedback' && (
        <div>
          <form onSubmit={postFeedback} style={{ marginBottom: 20 }}>
            <FormField label="Post new feedback" type="textarea" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Write feedback for this student..." rows={3} />
            <button type="submit" disabled={saving || !feedbackText.trim()} style={{ ...addBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Posting...' : 'Post feedback'}
            </button>
          </form>
          {studentFeedback.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No feedback yet.</p>
            : studentFeedback.map(f => (
              <FeedbackItem key={f.id} f={f}
                editingId={editingId} editText={editText}
                onEdit={() => { setEditingId(f.id); setEditText(f.content) }}
                onEditChange={setEditText}
                onSaveEdit={() => saveEdit(f.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteFeedback(f.id)} />
            ))
          }
        </div>
      )}

      {tab === 'class notes' && (
        <div>
          <form onSubmit={e => { e.preventDefault(); postFeedback(e) }} style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Select class</label>
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 14, color: 'var(--text-dark)', background: 'white' }}>
                <option value="">Pick a class...</option>
                {enrollments.map(ce => (
                  <option key={ce.classes?.id} value={ce.classes?.id}>{ce.classes?.name}</option>
                ))}
              </select>
            </div>
            <FormField label="Note for student" type="textarea" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="This note will appear in the student's Classes section..." rows={3} />
            <button type="submit" disabled={saving || !feedbackText.trim() || !selectedClassId} style={{ ...addBtn, opacity: (saving || !feedbackText.trim() || !selectedClassId) ? 0.5 : 1 }}>
              {saving ? 'Posting...' : 'Post class note'}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Class notes appear in the student's "Your Classes" section next to the relevant class.
          </p>
        </div>
      )}

      {tab === 'preferences' && (
        <div>
          {preferences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No preferences sent yet.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>The student can share preferred learning materials from their dashboard.</p>
            </div>
          ) : preferences.map(p => {
            const parts = p.content.split('. Notes: ')
            const materials = parts[0].replace('Preferred materials: ', '').split(', ')
            const note = parts[1] || null
            const seen = getSeenIds().has(p.id)
            return (
              <div key={p.id} style={{ background: 'rgba(67,73,42,0.04)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={seen} onChange={() => { markIdSeen(p.id); onItemSeen() }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Mark seen</span>
                  </label>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: note ? 10 : 0 }}>
                  {materials.map(m => (
                    <span key={m} style={{ padding: '5px 12px', borderRadius: 20, background: 'var(--text-dark)', color: 'var(--card-green)', fontSize: 12, fontWeight: 600 }}>{m}</span>
                  ))}
                </div>
                {note && <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.5, marginTop: 8, fontStyle: 'italic' }}>"{note}"</p>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'assignments' && (
        <div>
          {assignments.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No assignments.</p>
            : assignments.map(sa => {
              const seen = getSeenIds().has(sa.id)
              return (
                <div key={sa.id} style={{ background: 'rgba(67,73,42,0.05)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <strong style={{ fontSize: 14, color: 'var(--text-dark)' }}>{sa.assignments?.title || '(Untitled)'}</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={seen} onChange={() => { markIdSeen(sa.id); onItemSeen() }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Evaluated</span>
                    </label>
                  </div>
                  {sa.assignments?.due_date && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Due: {new Date(sa.assignments.due_date).toLocaleDateString()}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, background: sa.status === 'completed' ? 'var(--card-olive)' : 'rgba(67,73,42,0.1)', color: sa.status === 'completed' ? 'white' : 'var(--text-dark)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                      {sa.status || 'pending'}
                    </span>
                    <input placeholder="Grade" defaultValue={sa.grade || ''} onBlur={e => updateAssignment(sa.id, { grade: e.target.value })}
                      style={{ width: 80, padding: '4px 8px', borderRadius: 8, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 12, color: 'var(--text-dark)', background: 'white' }} />
                    <input placeholder="Feedback note" defaultValue={sa.feedback || ''} onBlur={e => updateAssignment(sa.id, { feedback: e.target.value })}
                      style={{ flex: 1, minWidth: 80, padding: '4px 8px', borderRadius: 8, border: '1.5px solid rgba(67,73,42,0.2)', fontSize: 12, color: 'var(--text-dark)', background: 'white' }} />
                  </div>
                  {sa.student_response && (
                    <div style={{ marginTop: 10, background: 'rgba(67,73,42,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Student response:</p>
                      <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.5 }}>{sa.student_response}</p>
                    </div>
                  )}
                  {sa.attachment_name && sa.attachment_url && <AttachmentLink path={sa.attachment_url} name={sa.attachment_name} />}
                </div>
              )
            })
          }
        </div>
      )}

      {tab === 'vocabulary' && (
        <div>
          {vocabulary.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vocabulary assigned.</p>
            : vocabulary.map(sv => (
              <div key={sv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(67,73,42,0.08)' }}>
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--text-dark)' }}>{sv.vocabulary?.word}</strong>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sv.vocabulary?.definition}</p>
                </div>
                <span style={{ fontSize: 12, background: sv.status === 'mastered' ? 'var(--card-olive)' : 'rgba(67,73,42,0.08)', color: sv.status === 'mastered' ? 'white' : 'var(--text-muted)', padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0, marginLeft: 10 }}>
                  {sv.status || 'new'}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'classes' && (
        <div>
          {enrollments.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not enrolled in any classes.</p>
            : enrollments.map(ce => (
              <div key={ce.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(67,73,42,0.08)' }}>
                <strong style={{ color: 'var(--text-dark)' }}>{ce.classes?.name}</strong>
                {ce.classes?.schedule && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ce.classes.schedule}</p>}
              </div>
            ))
          }
        </div>
      )}
    </Modal>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(67,73,42,0.08)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{value}</span>
    </div>
  )
}

function FeedbackItem({ f, editingId, editText, onEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete }) {
  const isEditing = editingId === f.id
  return (
    <div style={{ background: 'rgba(67,73,42,0.05)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      {isEditing ? (
        <>
          <textarea value={editText} onChange={e => onEditChange(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, border: '1.5px solid rgba(67,73,42,0.2)', background: 'white', color: 'var(--text-dark)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={onSaveEdit} style={{ ...addBtn, fontSize: 12, padding: '6px 14px' }}>Save</button>
            <button onClick={onCancelEdit} style={{ ...smallBtn }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-dark)' }}>{f.content}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(f.created_at).toLocaleDateString()}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onEdit} style={{ ...smallBtn, fontSize: 11 }}>Edit</button>
              <button onClick={onDelete} style={{ ...smallBtn, fontSize: 11, color: 'var(--danger)' }}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AttachmentLink({ path, name }) {
  async function open() {
    const { data, error } = await supabase.storage.from('assignment-attachments').createSignedUrl(path, 3600)
    if (error) { alert('Could not load file: ' + error.message); return }
    window.open(data.signedUrl, '_blank')
  }
  return (
    <button onClick={open} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: 'var(--card-olive)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
      📎 {name}
    </button>
  )
}

// ── Classes Tab ───────────────────────────────────────────────────────────────

function ClassesTab({ classes, students, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [form, setForm] = useState({ name: '', schedule: '', description: '' })

  function openNew() { setForm({ name: '', schedule: '', description: '' }); setEditClass(null); setShowModal(true) }
  function openEdit(c) { setForm({ name: c.name, schedule: c.schedule || '', description: c.description || '' }); setEditClass(c); setShowModal(true) }

  async function save(e) {
    e.preventDefault()
    if (editClass) await supabase.from('classes').update(form).eq('id', editClass.id)
    else await supabase.from('classes').insert(form)
    setShowModal(false)
    onRefresh()
  }

  async function deleteClass(id) {
    if (!confirm('Delete this class?')) return
    await supabase.from('classes').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={sectionTitle}>Classes ({classes.length})</h2>
        <button onClick={openNew} style={addBtn}>+ New class</button>
      </div>

      {showModal && (
        <Modal title={editClass ? 'Edit Class' : 'New Class'} onClose={() => setShowModal(false)}>
          <form onSubmit={save}>
            <FormField label="Class name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Conversation B1" />
            <FormField label="Schedule" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. Tuesdays 18:00" />
            <FormField label="Description" type="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="About this class..." />
            <EnrollmentManager classId={editClass?.id} students={students} />
            <button type="submit" style={{ ...addBtn, width: '100%', marginTop: 8 }}>
              {editClass ? 'Save changes' : 'Create class'}
            </button>
          </form>
        </Modal>
      )}

      <div style={gridStyle}>
        {classes.length === 0 && <Panel><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No classes yet.</p></Panel>}
        {classes.map(c => (
          <Panel key={c.id}>
            <strong style={{ fontSize: 17, color: 'var(--text-dark)' }}>{c.name}</strong>
            {c.schedule && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{c.schedule}</p>}
            {c.description && <p style={{ fontSize: 13, color: 'var(--text-dark)', marginTop: 8, lineHeight: 1.5 }}>{c.description}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => openEdit(c)} style={smallBtn}>Edit</button>
              <button onClick={() => deleteClass(c.id)} style={{ ...smallBtn, color: 'var(--danger)' }}>Delete</button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function EnrollmentManager({ classId, students }) {
  const [enrollments, setEnrollments] = useState([])

  useEffect(() => {
    if (!classId) return
    supabase.from('class_enrollments').select('student_id').eq('class_id', classId)
      .then(({ data }) => setEnrollments((data || []).map(e => e.student_id)))
  }, [classId])

  async function toggle(studentId) {
    if (enrollments.includes(studentId)) {
      await supabase.from('class_enrollments').delete().eq('class_id', classId).eq('student_id', studentId)
      setEnrollments(prev => prev.filter(id => id !== studentId))
    } else {
      await supabase.from('class_enrollments').insert({ class_id: classId, student_id: studentId })
      setEnrollments(prev => [...prev, studentId])
    }
  }

  if (!classId) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Enrolled students</label>
      {students.map(s => (
        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={enrollments.includes(s.id)} onChange={() => toggle(s.id)} />
          {s.full_name} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({s.email})</span>
        </label>
      ))}
    </div>
  )
}

// ── Assignments Tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ assignments, classes, students, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', class_id: '' })
  const [selectedStudents, setSelectedStudents] = useState([])
  const [assignAll, setAssignAll] = useState(true)

  async function save(e) {
    e.preventDefault()
    const { data: assignment } = await supabase.from('assignments').insert({
      title: form.title, description: form.description,
      due_date: form.due_date || null, class_id: form.class_id || null,
    }).select().single()

    if (!assignment) return

    let targetStudents = students
    if (!assignAll) {
      targetStudents = students.filter(s => selectedStudents.includes(s.id))
    } else if (form.class_id) {
      const { data: enrolled } = await supabase.from('class_enrollments').select('student_id').eq('class_id', form.class_id)
      targetStudents = students.filter(s => (enrolled || []).some(e => e.student_id === s.id))
    }

    if (targetStudents.length > 0) {
      await supabase.from('student_assignments').insert(
        targetStudents.map(s => ({ assignment_id: assignment.id, student_id: s.id, status: 'pending' }))
      )
    }

    setShowModal(false)
    setForm({ title: '', description: '', due_date: '', class_id: '' })
    setSelectedStudents([])
    onRefresh()
  }

  async function deleteAssignment(id) {
    if (!confirm('Delete this assignment?')) return
    await supabase.from('assignments').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={sectionTitle}>Assignments ({assignments.length})</h2>
        <button onClick={() => setShowModal(true)} style={addBtn}>+ New assignment</button>
      </div>

      {showModal && (
        <Modal title="New Assignment" onClose={() => setShowModal(false)}>
          <form onSubmit={save}>
            <FormField label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Assignment title" />
            <FormField label="Description" type="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Instructions..." rows={4} />
            <FormField label="Due date (optional)" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            <FormField label="Class (optional)" type="select" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} options={classes.map(c => ({ value: c.id, label: c.name }))} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Assign to</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={assignAll} onChange={e => setAssignAll(e.target.checked)} />
                {form.class_id ? 'All students in selected class' : 'All students'}
              </label>
              {!assignAll && students.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={selectedStudents.includes(s.id)}
                    onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                  {s.full_name}
                </label>
              ))}
            </div>
            <button type="submit" style={{ ...addBtn, width: '100%' }}>Create assignment</button>
          </form>
        </Modal>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {assignments.length === 0 && <Panel><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No assignments yet.</p></Panel>}
        {assignments.map(a => (
          <Panel key={a.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: 16, color: 'var(--text-dark)' }}>{a.title}</strong>
                {a.classes?.name && <span style={{ fontSize: 12, marginLeft: 10, background: 'var(--card-cream)', color: 'var(--text-dark)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{a.classes.name}</span>}
                {a.due_date && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Due: {new Date(a.due_date).toLocaleDateString()}</p>}
                {a.description && <p style={{ fontSize: 13, color: 'var(--text-dark)', marginTop: 6, lineHeight: 1.5 }}>{a.description}</p>}
              </div>
              <button onClick={() => deleteAssignment(a.id)} style={{ ...smallBtn, color: 'var(--danger)', flexShrink: 0, marginLeft: 12 }}>Delete</button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

// ── Vocabulary Tab ────────────────────────────────────────────────────────────

function VocabularyTab({ vocabulary, students, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ word: '', definition: '', example: '', level: '' })
  const [selectedStudents, setSelectedStudents] = useState([])
  const [assignAll, setAssignAll] = useState(true)
  const [search, setSearch] = useState('')

  async function save(e) {
    e.preventDefault()
    const { data: word } = await supabase.from('vocabulary').insert({
      word: form.word, definition: form.definition,
      example: form.example || null, level: form.level || null,
    }).select().single()

    if (!word) return
    const targets = assignAll ? students : students.filter(s => selectedStudents.includes(s.id))
    if (targets.length > 0) {
      await supabase.from('student_vocabulary').insert(targets.map(s => ({ vocabulary_id: word.id, student_id: s.id, status: 'new' })))
    }
    setShowModal(false)
    setForm({ word: '', definition: '', example: '', level: '' })
    setSelectedStudents([])
    onRefresh()
  }

  async function deleteWord(id) {
    if (!confirm('Delete this word?')) return
    await supabase.from('vocabulary').delete().eq('id', id)
    onRefresh()
  }

  const filtered = vocabulary.filter(v =>
    v.word.toLowerCase().includes(search.toLowerCase()) ||
    v.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={sectionTitle}>Vocabulary ({vocabulary.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words..."
            style={{ padding: '8px 14px', borderRadius: 20, border: '1.5px solid rgba(67,73,42,0.15)', background: 'white', color: 'var(--text-dark)', fontSize: 13, outline: 'none', width: 180 }} />
          <button onClick={() => setShowModal(true)} style={addBtn}>+ Add word</button>
        </div>
      </div>

      {showModal && (
        <Modal title="Add Vocabulary Word" onClose={() => setShowModal(false)}>
          <form onSubmit={save}>
            <FormField label="Word" value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} required placeholder="e.g. serendipity" />
            <FormField label="Definition" type="textarea" value={form.definition} onChange={e => setForm({ ...form, definition: e.target.value })} required placeholder="What does it mean?" rows={2} />
            <FormField label="Example sentence (optional)" type="textarea" value={form.example} onChange={e => setForm({ ...form, example: e.target.value })} placeholder="e.g. She found the book by serendipity." rows={2} />
            <FormField label="Level (optional)" type="select" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} options={['A1','A2','B1','B2','C1','C2'].map(l => ({ value: l, label: l }))} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Assign to</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={assignAll} onChange={e => setAssignAll(e.target.checked)} />
                All students
              </label>
              {!assignAll && students.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={selectedStudents.includes(s.id)}
                    onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                  {s.full_name}
                </label>
              ))}
            </div>
            <button type="submit" style={{ ...addBtn, width: '100%' }}>Add word</button>
          </form>
        </Modal>
      )}

      <div style={gridStyle}>
        {filtered.length === 0 && <Panel><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No words yet.</p></Panel>}
        {filtered.map(v => (
          <Panel key={v.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <strong style={{ fontSize: 17, color: 'var(--text-dark)' }}>{v.word}</strong>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {v.level && <span style={{ fontSize: 11, background: 'var(--card-cream)', color: 'var(--text-dark)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{v.level}</span>}
                <button onClick={() => deleteWord(v.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dark)', marginTop: 6, lineHeight: 1.5 }}>{v.definition}</p>
            {v.example && <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 6 }}>"{v.example}"</p>}
          </Panel>
        ))}
      </div>
    </div>
  )
}

// ── Seen-item helpers (localStorage) ─────────────────────────────────────────

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem('teacher_seen_ids') || '[]')) } catch { return new Set() }
}
function markIdSeen(id) {
  const s = getSeenIds(); s.add(id)
  localStorage.setItem('teacher_seen_ids', JSON.stringify([...s]))
}

// ── Shared ────────────────────────────────────────────────────────────────────

const sectionTitle = { fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }
const addBtn = { padding: '9px 20px', borderRadius: 20, border: 'none', background: 'var(--text-dark)', color: 'var(--card-green)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const smallBtn = { padding: '6px 12px', borderRadius: 20, border: 'none', background: 'rgba(67,73,42,0.08)', color: 'var(--text-dark)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }
