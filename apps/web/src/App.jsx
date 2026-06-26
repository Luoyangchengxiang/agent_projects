import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './components/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import AgentList from './pages/AgentList'
import ExecutionLogs from './pages/ExecutionLogs'
import ErrorLogs from './pages/ErrorLogs'
import ChatAdmin from './pages/ChatAdmin'
import Login from './pages/Login'
import Register from './pages/Register'
import MascotSelect from './pages/MascotSelect'
import useAuthStore from './stores/authStore'
import useMascotStore from './stores/mascotStore'

function App() {
  const { init, isInitialized } = useAuthStore()
  const { hasSelectedModel } = useMascotStore()

  useEffect(() => {
    init()
  }, [init])

  // 显示加载状态
  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f0f23',
        color: '#e0e0e0',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 看板娘选择（登录后、首次使用时） */}
      <Route
        path="/select-mascot"
        element={
          <ProtectedRoute>
            <MascotSelect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<AgentList />} />
        <Route path="logs" element={<ExecutionLogs />} />
        <Route path="errors" element={<ErrorLogs />} />
        <Route path="chat" element={<ChatAdmin />} />
      </Route>
    </Routes>
  )
}

export default App
