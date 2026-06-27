import { useState, useCallback } from 'react'
import { BellOutlined, SearchOutlined, UserOutlined, LogoutOutlined, SettingOutlined, SmileOutlined, CrownOutlined } from '@ant-design/icons'
import { Badge, Dropdown, App, Tag } from 'antd'
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

  const isAdmin = user?.role === 'admin'
  // 用后端数据库的 mascot_model_id 判断，不能用 localStorage（可被前端篡改）
  const mascotSelected = !!user?.mascot_model_id

  // 接收 NotificationPanel 的未读数更新
  const handleUnreadChange = useCallback((total) => {
    setUnreadCount(total)
  }, [])

  // 用户菜单
  const userMenuItems = [
    // 管理员：随时可更换看板娘
    // 普通用户：已选定后直接隐藏选项
    ...(isAdmin ? [{
      key: 'change-mascot',
      icon: <SmileOutlined />,
      label: '更换看板娘',
      onClick: () => navigate('/select-mascot')
    }] : (!mascotSelected ? [{
      key: 'select-mascot',
      icon: <SmileOutlined />,
      label: '选择看板娘',
      onClick: () => navigate('/select-mascot')
    }] : [])),
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings')
    },
    { type: 'divider' },
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

  // 角色标签颜色
  const roleColors = { admin: 'gold', support: 'cyan', user: 'blue', vip: 'purple' }
  const roleLabels = { admin: '管理员', support: '客服', user: '用户', vip: 'VIP' }

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

          {/* 用户头像 + 菜单 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                {isAdmin
                  ? <CrownOutlined style={{ color: '#fadb14' }} />
                  : <UserOutlined className="text-primary" />
                }
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm text-secondary leading-tight">
                  {user?.name || user?.email || '用户'}
                </span>
                <Tag
                  color={roleColors[user?.role] || 'default'}
                  style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', margin: 0, border: 'none' }}
                >
                  {roleLabels[user?.role] || user?.role || '未知'}
                </Tag>
              </div>
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
