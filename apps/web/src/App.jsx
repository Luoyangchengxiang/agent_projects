import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import useAuthStore from './stores/authStore'
import useMascotStore from './stores/mascotStore'

// 懒加载所有页面 — 不进入首屏 bundle
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AgentList = lazy(() => import('./pages/AgentList'))
const ExecutionLogs = lazy(() => import('./pages/ExecutionLogs'))
const ErrorLogs = lazy(() => import('./pages/ErrorLogs'))
const Reports = lazy(() => import('./pages/Reports'))
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'))
const CronJobs = lazy(() => import('./pages/CronJobs'))
const ChatAdmin = lazy(() => import('./pages/ChatAdmin'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const MascotSelect = lazy(() => import('./pages/MascotSelect'))
const PermissionManagement = lazy(() => import('./pages/PermissionManagement'))
const Settings = lazy(() => import('./pages/Settings'))

// 页面加载占位
function PageLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      minHeight: 200,
      color: '#9ca3af',
      fontSize: 14,
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid rgba(6, 182, 212, 0.2)',
        borderTopColor: '#06b6d4',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: 12,
      }} />
      加载中...
    </div>
  )
}


function App({ onReady }) {
  const { init, isInitialized } = useAuthStore()
  const { hasSelectedModel } = useMascotStore()

  useEffect(() => {
    init()
  }, [init])

  // 初始化完成后关闭预加载屏
  useEffect(() => {
    if (isInitialized && onReady) {
      onReady()
    }
  }, [isInitialized, onReady])

  // 显示加载状态
  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0f1117',
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
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
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

          {/* 主应用布局 */}
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
            <Route path="errors" element={
              <RoleRoute roles={['admin']}><ErrorLogs /></RoleRoute>
            } />
            <Route path="reports" element={
              <RoleRoute roles={['admin', 'vip']}><Reports /></RoleRoute>
            } />
            <Route path="graph" element={<KnowledgeGraph />} />
            <Route path="cronjobs" element={
              <RoleRoute roles={['admin']}><CronJobs /></RoleRoute>
            } />
            <Route path="chat" element={
              <RoleRoute roles={['admin', 'support']}><ChatAdmin /></RoleRoute>
            } />
            <Route path="permissions" element={
              <RoleRoute roles={['admin']}><PermissionManagement /></RoleRoute>
            } />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
