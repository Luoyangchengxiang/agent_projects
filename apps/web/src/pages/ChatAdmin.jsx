/**
 * 客服管理后台页面
 * 功能：对话列表、消息历史、人工接管、人工回复
 */
import { useState, useEffect, useRef } from 'react'
import {
  MessageOutlined,
  UserOutlined,
  RobotOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
  ReloadOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { chatService } from '../services/chatService'
import useAuthStore from '../stores/authStore'
import './chat-admin.css'

export default function ChatAdmin() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [replyInput, setReplyInput] = useState('')
  const [filter, setFilter] = useState({ status: '', mode: '' })
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef(null)

  // 加载对话列表
  const loadConversations = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.status) params.status = filter.status
      if (filter.mode) params.mode = filter.mode
      const res = await chatService.getConversations(params)
      setConversations(res.data || [])
    } catch (e) {
      console.error('加载对话列表失败:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadConversations()
    const timer = setInterval(loadConversations, 10000) // 10秒刷新
    return () => clearInterval(timer)
  }, [filter])

  // 加载消息历史
  const loadMessages = async (conv) => {
    setSelectedConv(conv)
    try {
      const res = await chatService.getConversationDetail(conv.id)
      setMessages(res.messages || [])
    } catch (e) {
      console.error('加载消息失败:', e)
    }
  }

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 人工接管
  const handleTakeover = async (convId) => {
    try {
      await chatService.takeover(convId)
      loadConversations()
      if (selectedConv?.id === convId) {
        loadMessages({ ...selectedConv, mode: 'human', human_agent_id: user.id })
      }
    } catch (e) {
      alert('接管失败: ' + e.message)
    }
  }

  // 释放给AI
  const handleRelease = async (convId) => {
    try {
      await chatService.release(convId)
      loadConversations()
      if (selectedConv?.id === convId) {
        loadMessages({ ...selectedConv, mode: 'ai', human_agent_id: null })
      }
    } catch (e) {
      alert('释放失败: ' + e.message)
    }
  }

  // 关闭对话
  const handleClose = async (convId) => {
    if (!confirm('确定关闭此对话？')) return
    try {
      await chatService.close(convId)
      loadConversations()
      if (selectedConv?.id === convId) {
        setSelectedConv(null)
        setMessages([])
      }
    } catch (e) {
      alert('关闭失败: ' + e.message)
    }
  }

  // 人工回复
  const handleReply = async () => {
    if (!replyInput.trim() || !selectedConv || sending) return
    setSending(true)
    try {
      await chatService.humanReply(selectedConv.id, replyInput.trim())
      setReplyInput('')
      await loadMessages(selectedConv)
    } catch (e) {
      alert('回复失败: ' + e.message)
    }
    setSending(false)
  }

  // 过滤对话
  const filteredConvs = conversations.filter((c) => {
    if (!search) return true
    return c.user_name?.includes(search) || String(c.id).includes(search)
  })

  return (
    <div className="chat-admin">
      <div className="chat-admin-header">
        <h1><CustomerServiceOutlined /> 客服管理</h1>
        <p>管理所有对话，支持人工接管和回复</p>
      </div>

      <div className="chat-admin-body">
        {/* 左侧：对话列表 */}
        <div className="chat-admin-sidebar">
          {/* 筛选 */}
          <div className="chat-admin-filters">
            <div className="chat-admin-search">
              <SearchOutlined />
              <input
                placeholder="搜索用户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="chat-admin-filter-row">
              <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                <option value="">全部状态</option>
                <option value="active">进行中</option>
                <option value="closed">已关闭</option>
              </select>
              <select value={filter.mode} onChange={(e) => setFilter({ ...filter, mode: e.target.value })}>
                <option value="">全部模式</option>
                <option value="ai">AI回复</option>
                <option value="human">人工接管</option>
              </select>
              <button className="chat-admin-refresh" onClick={loadConversations}>
                <ReloadOutlined />
              </button>
            </div>
          </div>

          {/* 对话列表 */}
          <div className="chat-admin-conv-list">
            {loading && conversations.length === 0 && (
              <div className="chat-admin-empty">加载中...</div>
            )}
            {!loading && filteredConvs.length === 0 && (
              <div className="chat-admin-empty">暂无对话</div>
            )}
            {filteredConvs.map((conv) => (
              <div
                key={conv.id}
                className={`chat-admin-conv-item ${selectedConv?.id === conv.id ? 'chat-admin-conv-item--active' : ''}`}
                onClick={() => loadMessages(conv)}
              >
                <div className="chat-admin-conv-avatar">
                  <UserOutlined />
                </div>
                <div className="chat-admin-conv-info">
                  <div className="chat-admin-conv-name">
                    {conv.user_name || `用户#${conv.user_id}`}
                    <span className={`chat-admin-mode-badge chat-admin-mode-badge--${conv.mode}`}>
                      {conv.mode === 'human' ? '人工' : 'AI'}
                    </span>
                  </div>
                  <div className="chat-admin-conv-preview">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '暂无消息'}
                  </div>
                </div>
                <div className={`chat-admin-status-dot chat-admin-status-dot--${conv.status}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：消息详情 */}
        <div className="chat-admin-main">
          {!selectedConv ? (
            <div className="chat-admin-no-selected">
              <MessageOutlined />
              <p>选择一个对话查看详情</p>
            </div>
          ) : (
            <>
              {/* 对话头部 */}
              <div className="chat-admin-conv-header">
                <div className="chat-admin-conv-header-info">
                  <span className="chat-admin-conv-title">
                    {selectedConv.user_name || `用户#${selectedConv.user_id}`}
                  </span>
                  <span className={`chat-admin-mode-badge chat-admin-mode-badge--${selectedConv.mode}`}>
                    {selectedConv.mode === 'human' ? '人工服务中' : 'AI服务中'}
                  </span>
                  <span className="chat-admin-conv-id">#{selectedConv.id}</span>
                </div>
                <div className="chat-admin-conv-actions">
                  {selectedConv.mode === 'ai' && selectedConv.status === 'active' && (
                    <button
                      className="chat-admin-action-btn chat-admin-action-btn--takeover"
                      onClick={() => handleTakeover(selectedConv.id)}
                    >
                      <SwapOutlined /> 接管
                    </button>
                  )}
                  {selectedConv.mode === 'human' && (
                    <button
                      className="chat-admin-action-btn chat-admin-action-btn--release"
                      onClick={() => handleRelease(selectedConv.id)}
                    >
                      <RobotOutlined /> 交给AI
                    </button>
                  )}
                  {selectedConv.status === 'active' && (
                    <button
                      className="chat-admin-action-btn chat-admin-action-btn--close"
                      onClick={() => handleClose(selectedConv.id)}
                    >
                      <CloseCircleOutlined /> 关闭
                    </button>
                  )}
                </div>
              </div>

              {/* 消息列表 */}
              <div className="chat-admin-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-admin-msg chat-admin-msg--${msg.sender_type}`}>
                    <div className="chat-admin-msg-avatar">
                      {msg.sender_type === 'ai' && <RobotOutlined />}
                      {msg.sender_type === 'human' && <CustomerServiceOutlined />}
                      {msg.sender_type === 'user' && <UserOutlined />}
                      {msg.sender_type === 'system' && <MessageOutlined />}
                    </div>
                    <div className="chat-admin-msg-content">
                      <div className="chat-admin-msg-sender">
                        {msg.sender_type === 'ai' && 'AI助手'}
                        {msg.sender_type === 'human' && '人工客服'}
                        {msg.sender_type === 'user' && (selectedConv.user_name || '用户')}
                        {msg.sender_type === 'system' && '系统'}
                      </div>
                      <div className="chat-admin-msg-text">{msg.content}</div>
                      <div className="chat-admin-msg-time">
                        {new Date(msg.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 人工回复输入框（仅人工接管模式） */}
              {selectedConv.mode === 'human' && selectedConv.status === 'active' && (
                <div className="chat-admin-reply">
                  <textarea
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                    placeholder="输入回复内容..."
                    rows={2}
                  />
                  <button
                    className="chat-admin-send-btn"
                    onClick={handleReply}
                    disabled={!replyInput.trim() || sending}
                  >
                    <SendOutlined /> 发送
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
