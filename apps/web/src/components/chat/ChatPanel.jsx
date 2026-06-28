/**
 * 客服聊天面板组件
 * 基于 RAG 文档检索回答用户问题
 */
import { useState, useRef, useEffect } from 'react'
import { 
  SendOutlined, CloseOutlined, RobotOutlined, UserOutlined, 
  CustomerServiceOutlined, ReloadOutlined, ExclamationCircleOutlined 
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useChatStore from '../../stores/chatStore'
import './chat.css'

export default function ChatPanel({ embedded = false, onClose }) {
  const { 
    conversation, messages, isLoading, isSending, sendMessage, 
    initConversation, retryMessage, transferToHuman 
  } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 初始化对话
  useEffect(() => {
    initConversation()
  }, [initConversation])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isSending) return
    const msg = input
    setInput('')
    await sendMessage(msg)
    inputRef.current?.focus()
  }

  // 重试失败的消息
  const handleRetry = async (msgId, content) => {
    if (isSending) return
    await retryMessage(msgId, content)
    inputRef.current?.focus()
  }

  // 转人工
  const handleTransferToHuman = async () => {
    if (isSending) return
    await transferToHuman()
  }

  // 点击常见问题
  const handleFaqClick = async (question) => {
    if (isSending) return
    await sendMessage(question)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getSenderIcon = (type) => {
    switch (type) {
      case 'ai': return <RobotOutlined />
      case 'human': return <CustomerServiceOutlined />
      case 'user': return <UserOutlined />
      default: return <RobotOutlined />
    }
  }

  const getSenderName = (msg) => {
    switch (msg.sender_type) {
      case 'ai': return 'AI助手'
      case 'human': return '人工客服'
      case 'user': return '我'
      case 'system': return '系统'
      default: return '未知'
    }
  }

  const isHumanMode = conversation?.mode === 'human'

  return (
    <div className={`chat-panel ${embedded ? 'chat-panel--embedded' : 'chat-panel--float'}`}>
      {/* 头部 */}
      <div className="chat-header">
        <div className="chat-header-info">
          <RobotOutlined className="chat-header-icon" />
          <span className="chat-header-title">
            {isHumanMode ? '人工客服' : 'AI客服'}
          </span>
          {isHumanMode && <span className="chat-badge-human">人工服务中</span>}
          {!isHumanMode && conversation && <span className="chat-badge-ai">AI服务中</span>}
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          <CloseOutlined />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {isLoading && (
          <div className="chat-loading">
            <div className="chat-loading-dot" />
            <div className="chat-loading-dot" />
            <div className="chat-loading-dot" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message chat-message--${msg.sender_type} ${msg._sending ? 'chat-message--sending' : ''} ${msg._failed ? 'chat-message--failed' : ''}`}
          >
            {msg.sender_type !== 'user' && msg.sender_type !== 'system' && (
              <div className="chat-avatar">
                {getSenderIcon(msg.sender_type)}
              </div>
            )}
            <div className="chat-bubble-wrap">
              {msg.sender_type !== 'user' && msg.sender_type !== 'system' && (
                <span className="chat-sender-name">{getSenderName(msg)}</span>
              )}
              <div className="chat-bubble">
                {msg.sender_type === 'system' ? (
                  <div className="chat-system-msg">{msg.content}</div>
                ) : (
                  <div className="chat-msg-content">
                    {msg.sender_type === 'ai' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // 禁用代码块渲染，改为内联显示
                          code: ({node, inline, className, children, ...props}) => {
                            if (inline) {
                              return <code className="chat-inline-code" {...props}>{children}</code>
                            }
                            // 代码块只显示内容，不显示语法高亮
                            return <span className="chat-code-block">{children}</span>
                          },
                          // 禁用图片渲染
                          img: () => null,
                          // 链接在新窗口打开
                          a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content.split('\n').map((line, i) => (
                        <span key={i}>
                          {line.startsWith('📌') ? <strong>{line}</strong> : line}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      ))
                    )}
                  </div>
                )}

                {/* FAQ 按钮（兜底回复时展示） */}
                {msg.metadata?.faq && msg.metadata.faq.length > 0 && (
                  <div className="chat-faq-list">
                    <div className="chat-faq-title">💡 你可能想问：</div>
                    {msg.metadata.faq.map((item, i) => (
                      <button 
                        key={i} 
                        className="chat-faq-btn"
                        onClick={() => handleFaqClick(item.q)}
                        disabled={isSending}
                      >
                        {item.q}
                      </button>
                    ))}
                    <button 
                      className="chat-transfer-btn"
                      onClick={handleTransferToHuman}
                      disabled={isSending}
                    >
                      <CustomerServiceOutlined /> 转人工客服
                    </button>
                  </div>
                )}

                {/* 发送失败提示 */}
                {msg._failed && (
                  <div className="chat-msg-failed">
                    <ExclamationCircleOutlined /> 发送失败
                    <button className="chat-retry-btn" onClick={() => handleRetry(msg.id, msg.content)}>
                      <ReloadOutlined /> 重发
                    </button>
                  </div>
                )}
              </div>
              <span className="chat-time">
                {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.sender_type === 'user' && (
              <div className="chat-avatar chat-avatar--user">
                <UserOutlined />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="chat-message chat-message--ai">
            <div className="chat-avatar"><RobotOutlined /></div>
            <div className="chat-bubble-wrap">
              <div className="chat-bubble chat-bubble--typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="chat-input-area">
        {isHumanMode && (
          <div className="chat-input-hint">人工客服服务中</div>
        )}
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isHumanMode ? '发送消息给人工客服...' : '输入你的问题...'}
          rows={1}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isSending}
        >
          <SendOutlined />
        </button>
      </div>
    </div>
  )
}
