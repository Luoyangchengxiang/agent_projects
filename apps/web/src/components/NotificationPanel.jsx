/**
 * 消息中心弹框组件
 * 分类显示：执行结果、错误日志、客服消息、版本更新
 */
import { useState, useEffect } from 'react'
import { Badge, Tabs, Empty, Tag, Button, App } from 'antd'
import { 
  BellOutlined,
  RobotOutlined,
  WarningOutlined,
  MessageOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { executionLogApi, errorLogApi } from '@agent-monitor/api'

export default function NotificationPanel({ open, onClose }) {
  const { message } = App.useApp()
  const [activeTab, setActiveTab] = useState('executions')
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    executions: [],
    errors: [],
    messages: [],
    updates: []
  })
  const [unreadCounts, setUnreadCounts] = useState({
    executions: 0,
    errors: 0,
    messages: 0,
    updates: 0
  })

  // 加载通知数据
  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      // 并行加载各类通知
      const [executionsRes, errorsRes] = await Promise.all([
        executionLogApi.getList({ page: 1, per_page: 10 }).catch(() => ({ data: { data: [] } })),
        errorLogApi.getList({ page: 1, per_page: 10, status: 'open' }).catch(() => ({ data: { data: [] } }))
      ])

      setNotifications({
        executions: executionsRes.data?.data || [],
        errors: errorsRes.data?.data || [],
        messages: [
          // 模拟客服消息
          { id: 1, content: '欢迎使用 Agent 监控系统！', time: '2026-06-26 10:00', read: false },
        ],
        updates: [
          // 模拟版本更新
          { id: 1, version: 'v1.2.0', content: '新增看板娘拖拽功能、消息中心', time: '2026-06-26', read: false },
          { id: 2, version: 'v1.1.0', content: '新增执行结果汇总、Markdown 渲染', time: '2026-06-25', read: true },
        ]
      })

      // 计算未读数
      setUnreadCounts({
        executions: executionsRes.data?.data?.filter(e => !e.read)?.length || 0,
        errors: errorsRes.data?.data?.length || 0,
        messages: 1,
        updates: 1
      })
    } catch (error) {
      console.error('加载通知失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (time) => {
    if (!time) return ''
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 渲染执行结果列表
  const renderExecutions = () => (
    <div className="notification-list">
      {notifications.executions.length > 0 ? (
        notifications.executions.map(item => (
          <div key={item.id} className="notification-item">
            <div className="notification-icon">
              {item.status === 'success' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              )}
            </div>
            <div className="notification-content">
              <div className="notification-title">
                {item.agent?.name || `Agent-${item.agent_id}`}
                <Tag color={item.status === 'success' ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                  {item.status === 'success' ? '成功' : '失败'}
                </Tag>
              </div>
              <div className="notification-desc">
                {item.result_summary?.substring(0, 50) || item.task_id || '无摘要'}
              </div>
              <div className="notification-time">
                <ClockCircleOutlined /> {formatTime(item.created_at)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty description="暂无执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染错误日志列表
  const renderErrors = () => (
    <div className="notification-list">
      {notifications.errors.length > 0 ? (
        notifications.errors.map(item => (
          <div key={item.id} className="notification-item notification-item--error">
            <div className="notification-icon">
              <WarningOutlined style={{ color: '#ff4d4f' }} />
            </div>
            <div className="notification-content">
              <div className="notification-title">{item.error_type || '未知错误'}</div>
              <div className="notification-desc">{item.message?.substring(0, 60)}</div>
              <div className="notification-time">
                <ClockCircleOutlined /> {formatTime(item.created_at)}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty description="暂无错误日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染客服消息列表
  const renderMessages = () => (
    <div className="notification-list">
      {notifications.messages.length > 0 ? (
        notifications.messages.map(item => (
          <div key={item.id} className="notification-item">
            <div className="notification-icon">
              <MessageOutlined style={{ color: '#1890ff' }} />
            </div>
            <div className="notification-content">
              <div className="notification-title">系统消息</div>
              <div className="notification-desc">{item.content}</div>
              <div className="notification-time">
                <ClockCircleOutlined /> {item.time}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染版本更新列表
  const renderUpdates = () => (
    <div className="notification-list">
      {notifications.updates.length > 0 ? (
        notifications.updates.map(item => (
          <div key={item.id} className="notification-item">
            <div className="notification-icon">
              <InfoCircleOutlined style={{ color: '#722ed1' }} />
            </div>
            <div className="notification-content">
              <div className="notification-title">
                {item.version}
                {!item.read && <Badge status="processing" style={{ marginLeft: 8 }} />}
              </div>
              <div className="notification-desc">{item.content}</div>
              <div className="notification-time">
                <ClockCircleOutlined /> {item.time}
              </div>
            </div>
          </div>
        ))
      ) : (
        <Empty description="暂无更新" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // Tab 项
  const tabItems = [
    {
      key: 'executions',
      label: (
        <span>
          <RobotOutlined />
          执行结果
          {unreadCounts.executions > 0 && <Badge count={unreadCounts.executions} size="small" style={{ marginLeft: 4 }} />}
        </span>
      ),
      children: renderExecutions()
    },
    {
      key: 'errors',
      label: (
        <span>
          <WarningOutlined />
          错误日志
          {unreadCounts.errors > 0 && <Badge count={unreadCounts.errors} size="small" style={{ marginLeft: 4 }} />}
        </span>
      ),
      children: renderErrors()
    },
    {
      key: 'messages',
      label: (
        <span>
          <MessageOutlined />
          客服消息
          {unreadCounts.messages > 0 && <Badge count={unreadCounts.messages} size="small" style={{ marginLeft: 4 }} />}
        </span>
      ),
      children: renderMessages()
    },
    {
      key: 'updates',
      label: (
        <span>
          <InfoCircleOutlined />
          版本更新
          {unreadCounts.updates > 0 && <Badge count={unreadCounts.updates} size="small" style={{ marginLeft: 4 }} />}
        </span>
      ),
      children: renderUpdates()
    }
  ]

  if (!open) return null

  return (
    <div className="notification-panel" style={{
      position: 'fixed',
      top: 60,
      right: 20,
      width: 400,
      maxHeight: 500,
      background: '#1a1a2e',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 1001,
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>消息中心</span>
        <Button type="text" size="small" onClick={onClose}>关闭</Button>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
        style={{ padding: '0 8px' }}
        tabBarStyle={{ marginBottom: 0 }}
      />
    </div>
  )
}
