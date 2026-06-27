/**
 * 角色权限路由组件
 * 用于保护需要特定角色才能访问的页面
 */
import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

/**
 * @param {Object} props
 * @param {string[]} props.roles - 允许访问的角色列表，为空则所有人可访问
 * @param {React.ReactNode} props.children - 子组件
 */
export default function RoleRoute({ roles = [], children }) {
  const { user, isAuthenticated } = useAuthStore()

  // 未登录跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // roles 为空数组表示所有人可访问
  if (roles.length === 0) {
    return children
  }

  // 检查用户角色是否在允许列表中
  if (!roles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
