import { useState, useCallback } from 'react'
import { BellOutlined, SearchOutlined, UserOutlined, LogoutOutlined, SettingOutlined, SmileOutlined } from '@ant-design/icons'
import { Badge, Dropdown, App } from 'antd'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useMascotStore from '../stores/mascotStore'
import NotificationPanel from './NotificationPanel'

function Header() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { reset: resetMascot } = useMascotStore()
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // 接收 NotificationPanel 的未读数更新
  const handleUnreadChange = useCallback((total) => {
    setUnreadCount(total)
  }, [])

  // 用户菜单
  const userMenuItems = [
    {
      key: 'change-mascot',
      icon: <SmileOutlined />,
      label: '更换看板娘',
      onClick: () => {
        resetMascot()
        navigate('/select-mascot')
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout()
        message.success('已退出登录')
        navigate('/login')
      }
    }
  ]

  return (
    <>
      <div className="header flex items-center justify-between px-6">
        {/* 搜索框 */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="搜索Agent、日志..."
              className="input pl-10 pr-4 py-2"
            />
          </div>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-4">
          {/* 通知按钮 */}
          <button 
            className="btn-ghost relative"
            onClick={() => setNotificationOpen(!notificationOpen)}
          >
            <Badge count={unreadCount} size="small">
              <BellOutlined className="text-lg" />
            </Badge>
          </button>

          {/* 用户头像 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <UserOutlined className="text-primary" />
              </div>
              <span className="text-sm text-secondary">
                {user?.username || 'Admin'}
              </span>
            </div>
          </Dropdown>
        </div>
      </div>

      {/* 消息中心弹框 */}
      <NotificationPanel 
        open={notificationOpen} 
        onClose={() => setNotificationOpen(false)}
        onUnreadChange={handleUnreadChange}
      />
    </>
  )
}

export default Header
