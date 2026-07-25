import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Notebook from './pages/Notebook'
import TeacherDashboard from './pages/TeacherDashboard'

function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#c2ca86',fontSize:18 }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
  return children
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#c2ca86',fontSize:18 }}>Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/dashboard'} replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute role="student">
          <Notebook />
        </ProtectedRoute>
      } />
      <Route path="/teacher" element={
        <ProtectedRoute role="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to={user ? (profile?.role === 'teacher' ? '/teacher' : '/dashboard') : '/login'} replace />} />
    </Routes>
  )
}
