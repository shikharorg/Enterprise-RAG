import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import AdminLoginPage from './pages/AdminLoginPage'
import ChatPage from './pages/ChatPage'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user === null) return <Navigate to="/" replace />
  return children
}

function RequireGuest({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user) return <Navigate to="/chat" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
          <Route path="/admin" element={<RequireGuest><AdminLoginPage /></RequireGuest>} />
          <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
