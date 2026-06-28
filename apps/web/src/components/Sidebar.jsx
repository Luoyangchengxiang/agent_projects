import { NavLink, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  RobotOutlined,
  FileTextOutlined,
  BugOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  AlertOutlined,
  FileSearchOutlined,
} from '@ant-design/icons'
import { Badge } from 'antd'
import useAuthStore from '../stores/authStore'

// 菜单配置：roles 定义哪些角色可以访问，为空则所有人可见
const menuItems = [
  { path: '/', icon: <DashboardOutlined />, label: '仪表盘', roles: [] },
  { path: '/agents', icon: <RobotOutlined />, label: 'Agent列表', roles: [] },
  { path: '/logs', icon: <FileTextOutlined />, label: '执行日志', roles: [] },
  { path: '/errors', icon: <BugOutlined />, label: '错误日志', roles: ['admin'] },
  { path: '/reports', icon: <BarChartOutlined />, label: '数据报告', roles: ['admin', 'vip'] },
  { path: '/graph', icon: <ApartmentOutlined />, label: '知识图谱', roles: [] },
  { path: '/cronjobs', icon: <ClockCircleOutlined />, label: '定时任务', roles: ['admin'] },
  { path: '/chat', icon: <CustomerServiceOutlined />, label: '客服管理', roles: ['admin', 'support'] },
  { path: '/system-alerts', icon: <AlertOutlined />, label: '系统告警', roles: ['admin'] },
  { path: '/system-logs', icon: <FileSearchOutlined />, label: '系统日志', roles: ['admin'] },
  { path: '/permissions', icon: <TeamOutlined />, label: '权限管理', roles: ['admin'] },
  { path: '/settings', icon: <SettingOutlined />, label: '设置', roles: [] },
]

function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // 根据用户角色过滤菜单
  const filteredMenuItems = menuItems.filter(item => {
    // roles 为空数组表示所有人可见
    if (!item.roles || item.roles.length === 0) {
      return true
    }
    // 检查用户角色是否在允许列表中
    return item.roles.includes(user?.role)
  })

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="text-xl font-bold text-primary">Agent Monitor</h1>
        <p className="text-xs text-muted mt-1">智能体监控系统</p>
      </div>

      {/* 导航菜单 */}
      <nav className="mt-4 px-3">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md mb-1 transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部 — 用户信息 + 退出 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
        {/* 用户信息 */}
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <UserOutlined className="text-primary text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary truncate">{user?.name || '用户'}</p>
            <p className="text-xs text-muted truncate">
              {user?.role === 'admin' ? '管理员' : user?.role === 'support' ? '客服人员' : user?.role === 'vip' ? 'VIP 用户' : '普通用户'}
            </p>
          </div>
        </div>

        {/* 退出按钮 */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <LogoutOutlined />
          <span className="text-sm">退出登录</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
