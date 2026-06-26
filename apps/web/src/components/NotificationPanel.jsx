/**
 * 消息中心弹框组件
 * 分类显示：执行结果、错误日志、客服消息、版本更新
 * 支持点击详情跳转到对应页面并清除未读
 */
import { useState, useEffect, useCallback } from 'react'
import { Badge, Tabs, Empty, Tag, Button, App } from 'antd'
import { 
  BellOutlined,
  RobotOutlined,
  WarningOutlined,
  MessageOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RightOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { executionLogApi, errorLogApi, versionUpdateApi } from '@agent-monitor/api'

export default function NotificationPanel({ open, onClose, onUnreadChange }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('executions')
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    executions: [],
    errors: [],
    messages: [],
    updates: []
  })

  // 从 localStorage 恢复已读状态
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('notification_read_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // 持久化已读状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('notification_read_ids', JSON.stringify([...readIds]))
    } catch {
      // localStorage 满了或其他错误，静默处理
    }
  }, [readIds])

  // 组件挂载时立即加载通知数据（不只是打开面板时）
  useEffect(() => {
    loadNotifications()
  }, [])

  // 打开面板时刷新数据（获取最新通知）
  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  // 计算未读数并通知父组件
  const updateUnreadCount = useCallback(() => {
    const counts = {
      executions: notifications.executions.filter(e => !readIds.has(`exec-${e.id}`)).length,
      errors: notifications.errors.filter(e => !readIds.has(`error-${e.id}`)).length,
      messages: notifications.messages.filter(e => !readIds.has(`msg-${e.id}`)).length,
      updates: notifications.updates.filter(e => !readIds.has(`update-${e.id}`)).length,
    }
    const total = counts.executions + counts.errors + counts.messages + counts.updates
    if (onUnreadChange) {
      onUnreadChange(total, counts)
    }
    return counts
  }, [notifications, readIds, onUnreadChange])

  useEffect(() => {
    updateUnreadCount()
  }, [notifications, readIds, updateUnreadCount])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const [executionsRes, errorsRes, updatesRes] = await Promise.all([
        executionLogApi.getList({ page: 1, per_page: 10 }).catch(() => ({ data: { data: [] } })),
        errorLogApi.getList({ page: 1, per_page: 10, status: 'open' }).catch(() => ({ data: { data: [] } })),
        versionUpdateApi.getLatest().catch(() => ({ data: [] }))
      ])

      setNotifications({
        executions: executionsRes.data?.data || [],
        errors: errorsRes.data?.data || [],
        messages: [
          { id: 1, content: '欢迎使用 Agent 监控系统！', time: '2026-06-26 10:00' },
        ],
        updates: (updatesRes.data || []).map(item => ({
          id: item.id,
          version: item.version,
          content: item.title,
          detail: item.content,
          type: item.type,
          type_label: item.type_label,
          type_color: item.type_color,
          time: item.release_date,
          is_highlight: item.is_highlight,
        }))
      })
    } catch (error) {
      console.error('加载通知失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 标记单条为已读
  const markAsRead = (type, id) => {
    setReadIds(prev => new Set([...prev, `${type}-${id}`]))
  }

  // 标记当前 tab 全部已读
  const markTabAsRead = (tabKey) => {
    const items = notifications[tabKey] || []
    const prefix = {
      executions: 'exec',
      errors: 'error',
      messages: 'msg',
      updates: 'update'
    }[tabKey]
    setReadIds(prev => {
      const next = new Set(prev)
      items.forEach(item => next.add(`${prefix}-${item.id}`))
      return next
    })
  }

  // 点击详情跳转
  const handleGoDetail = (type, item) => {
    markAsRead(type, item.id)
    switch (type) {
      case 'exec':
        navigate('/logs')
        break
      case 'error':
        navigate('/errors')
        break
      case 'msg':
        navigate('/chat')
        break
      case 'update':
        // 版本更新不跳转
        break
    }
    onClose()
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
        notifications.executions.map(item => {
          const isRead = readIds.has(`exec-${item.id}`)
          return (
            <div 
              key={item.id} 
              className={`notification-item ${isRead ? 'notification-item--read' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleGoDetail('exec', item)}
            >
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
                  {!isRead && <Badge status="processing" style={{ marginLeft: 4 }} />}
                </div>
                <div className="notification-desc">
                  {item.result_summary?.substring(0, 50) || item.task_id || '无摘要'}
                </div>
                <div className="notification-time">
                  <ClockCircleOutlined /> {formatTime(item.created_at)}
                  <span style={{ marginLeft: 8, color: '#06b6d4' }}>查看详情 <RightOutlined /></span>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <Empty description="暂无执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染错误日志列表
  const renderErrors = () => (
    <div className="notification-list">
      {notifications.errors.length > 0 ? (
        notifications.errors.map(item => {
          const isRead = readIds.has(`error-${item.id}`)
          return (
            <div 
              key={item.id} 
              className={`notification-item notification-item--error ${isRead ? 'notification-item--read' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleGoDetail('error', item)}
            >
              <div className="notification-icon">
                <WarningOutlined style={{ color: '#ff4d4f' }} />
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {item.error_type || '未知错误'}
                  {!isRead && <Badge status="processing" style={{ marginLeft: 4 }} />}
                </div>
                <div className="notification-desc">{item.message?.substring(0, 60)}</div>
                <div className="notification-time">
                  <ClockCircleOutlined /> {formatTime(item.created_at)}
                  <span style={{ marginLeft: 8, color: '#06b6d4' }}>查看详情 <RightOutlined /></span>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <Empty description="暂无错误日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染客服消息列表
  const renderMessages = () => (
    <div className="notification-list">
      {notifications.messages.length > 0 ? (
        notifications.messages.map(item => {
          const isRead = readIds.has(`msg-${item.id}`)
          return (
            <div 
              key={item.id} 
              className={`notification-item ${isRead ? 'notification-item--read' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleGoDetail('msg', item)}
            >
              <div className="notification-icon">
                <MessageOutlined style={{ color: '#1890ff' }} />
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  系统消息
                  {!isRead && <Badge status="processing" style={{ marginLeft: 4 }} />}
                </div>
                <div className="notification-desc">{item.content}</div>
                <div className="notification-time">
                  <ClockCircleOutlined /> {item.time}
                  <span style={{ marginLeft: 8, color: '#06b6d4' }}>查看详情 <RightOutlined /></span>
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 渲染版本更新列表
  const renderUpdates = () => (
    <div className="notification-list">
      {notifications.updates.length > 0 ? (
        notifications.updates.map(item => {
          const isRead = readIds.has(`update-${item.id}`)
          return (
            <div 
              key={item.id} 
              className={`notification-item ${isRead ? 'notification-item--read' : ''}`}
              onClick={() => markAsRead('update', item.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="notification-icon">
                <InfoCircleOutlined style={{ color: item.type_color || '#722ed1' }} />
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {item.version}
                  {item.type_label && (
                    <Tag color={item.type_color} style={{ marginLeft: 8, fontSize: 11 }}>
                      {item.type_label}
                    </Tag>
                  )}
                  {item.is_highlight && (
                    <Tag color="gold" style={{ marginLeft: 4, fontSize: 11 }}>
                      重要
                    </Tag>
                  )}
                  {!isRead && <Badge status="processing" style={{ marginLeft: 4 }} />}
                </div>
                <div className="notification-desc" style={{ fontWeight: 500 }}>
                  {item.content}
                </div>
                {item.detail && (
                  <div className="notification-desc" style={{ 
                    fontSize: 12, 
                    color: '#8b8b8b',
                    marginTop: 4,
                    whiteSpace: 'pre-line',
                    maxHeight: 60,
                    overflow: 'hidden'
                  }}>
                    {item.detail}
                  </div>
                )}
                <div className="notification-time">
                  <ClockCircleOutlined /> {item.time}
                </div>
              </div>
            </div>
          )
        })
      ) : (
        <Empty description="暂无更新" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  )

  // 计算各 tab 未读数
  const tabCounts = {
    executions: notifications.executions.filter(e => !readIds.has(`exec-${e.id}`)).length,
    errors: notifications.errors.filter(e => !readIds.has(`error-${e.id}`)).length,
    messages: notifications.messages.filter(e => !readIds.has(`msg-${e.id}`)).length,
    updates: notifications.updates.filter(e => !readIds.has(`update-${e.id}`)).length,
  }

  // Tab 项
  const tabItems = [
    {
      key: 'executions',
      label: (
        <span>
          <RobotOutlined />
          执行结果
          {tabCounts.executions > 0 && <Badge count={tabCounts.executions} size="small" style={{ marginLeft: 4 }} />}
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
          {tabCounts.errors > 0 && <Badge count={tabCounts.errors} size="small" style={{ marginLeft: 4 }} />}
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
          {tabCounts.messages > 0 && <Badge count={tabCounts.messages} size="small" style={{ marginLeft: 4 }} />}
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
          {tabCounts.updates > 0 && <Badge count={tabCounts.updates} size="small" style={{ marginLeft: 4 }} />}
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
        <div>
          <Button 
            type="text" 
            size="small" 
            onClick={() => markTabAsRead(activeTab)}
            style={{ marginRight: 8, color: '#06b6d4' }}
          >
            全部已读
          </Button>
          <Button type="text" size="small" onClick={onClose}>关闭</Button>
        </div>
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
