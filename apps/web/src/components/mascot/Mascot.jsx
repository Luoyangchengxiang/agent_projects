/**
 * 可拖拽的看板娘组件
 * 支持拖拽改变位置、位置记忆
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import useMascotStore from '../../stores/mascotStore'
import useChatStore from '../../stores/chatStore'
import Live2DRenderer from './Live2DRenderer'
import RadialMenu from './RadialMenu'
import ChatPanel from '../chat/ChatPanel'
import './mascot.css'

export default function Mascot() {
  const {
    modelId,
    isMenuOpen,
    isChatOpen,
    isHovering,
    isLoading,
    openMenu,
    closeMenu,
    openChat,
    closeChat,
    setHovering,
    hasSelectedModel,
  } = useMascotStore()

  const { reset: resetChat } = useChatStore()
  
  // 拖拽相关状态
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('mascot-position')
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 200, y: window.innerHeight - 250 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const mascotRef = useRef(null)

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem('mascot-position', JSON.stringify(position))
  }, [position])

  // 鼠标按下 - 开始拖拽
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // 只响应左键
    
    const rect = mascotRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
    e.preventDefault()
  }, [])

  // 鼠标移动 - 拖拽中
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // 限制在视口范围内
    const maxX = window.innerWidth - 150
    const maxY = window.innerHeight - 150
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }, [isDragging, dragOffset])

  // 鼠标释放 - 结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // 未选择模型时不显示
  if (!hasSelectedModel()) return null

  // 点击看板娘 → 打开环状菜单（仅在非拖拽状态下）
  const handleClick = (e) => {
    if (isDragging) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    openMenu(x, y)
  }

  // 环状菜单点击处理
  const handleMenuItemClick = (itemId) => {
    closeMenu()
    switch (itemId) {
      case 'chat':
        openChat()
        break
      case 'status':
        // TODO: 显示系统状态卡片
        break
      case 'interact':
        // TODO: 互动动画
        break
      case 'settings':
        // TODO: 设置面板
        break
      case 'logs':
        // TODO: 日志快速查看
        break
    }
  }

  return (
    <div 
      ref={mascotRef}
      className={`mascot-container ${isDragging ? 'mascot-dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Live2D 看板娘 */}
      <div
        className={`mascot-character ${isHovering ? 'mascot-character--hover' : ''}`}
      >
        <Live2DRenderer
          onHover={setHovering}
          onClick={() => {}}
        />

        {/* Hover 提示 */}
        {isHovering && !isMenuOpen && !isDragging && (
          <div className="mascot-tooltip">
            <span>❓ 点我互动</span>
          </div>
        )}

        {/* 加载指示 */}
        {isLoading && (
          <div className="mascot-loading">
            <div className="mascot-loading-spinner" />
          </div>
        )}
      </div>

      {/* 环状菜单 */}
      <RadialMenu onItemClick={handleMenuItemClick} />

      {/* 客服对话面板 */}
      {isChatOpen && (
        <div className="mascot-chat-wrapper">
          <ChatPanel embedded={false} onClose={closeChat} />
        </div>
      )}
    </div>
  )
}
