import { useAuth } from '../context/AuthContext'

const PAGE_BG = '#f2ece4'
const CARD_BG = '#ffffff'
const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'

export default function TeacherPlaceholder() {
  const { profile, signOut } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div style={{
      minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: CARD_BG, borderRadius: 20, padding: '40px 36px', maxWidth: 460,
        textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 800, color: TEXT, margin: '0 0 12px' }}>
          Hi, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
          The teacher dashboard is being rebuilt around the new Notebook. For now, manage class links,
          extra activities, and student data directly in the Supabase Studio table editor.
        </p>
        <button onClick={signOut} style={{
          padding: '10px 22px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.12)',
          background: 'transparent', fontSize: 13, color: MUTED, cursor: 'pointer',
        }}>Sign out</button>
      </div>
    </div>
  )
}
