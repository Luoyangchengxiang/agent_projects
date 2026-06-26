/**
 * 受保护路由组件
 * 未登录用户自动跳转到登录页
 */

import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const location = useLocation()

  // 等待初始化完成
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
          <p>验证身份中...</p>
        </div>
      </div>
    )
  }

  // 初始化完成后，检查是否已登录
  if (!isAuthenticated) {
    // 保存当前路径，登录后跳转回来
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}
