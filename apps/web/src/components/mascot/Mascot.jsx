/**
 * 可拖拽的看板娘组件（重构版）
 * 
 * 修复：
 * - 区分点击和拖拽（5px 阈值）
 * - RadialMenu 通过 Portal 独立渲染
 * - 互动模式集成
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useMascotStore from '../../stores/mascotStore'
import Live2DRenderer from './Live2DRenderer'
import RadialMenu from './RadialMenu'
import ChatPanel from '../chat/ChatPanel'
import './mascot.css'

// 拖拽阈值（像素）：移动超过此距离才算拖拽
const DRAG_THRESHOLD = 5

export default function Mascot() {
  const {
    isMenuOpen,
    isChatOpen,
    isHovering,
    isLoading,
    interactMode,
    openMenu,
    closeMenu,
    openChat,
    closeChat,
    setHovering,
    hasSelectedModel,
    toggleInteractMode,
    openSettings,
  } = useMascotStore()

  const navigate = useNavigate()

  // 拖拽相关状态
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('mascot-position')
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 200, y: window.innerHeight - 250 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [mouseDown, setMouseDown] = useState(false) // 鼠标是否按下（用于触发全局监听）
  const dragStartRef = useRef(null) // 鼠标按下时的起点
  const dragOffsetRef = useRef({ x: 0, y: 0 }) // 鼠标相对 mascot 的偏移
  const hasMovedRef = useRef(false) // 是否移动超过阈值
  const mascotRef = useRef(null)

  // 保存位置到 localStorage
  useEffect(() => {
    localStorage.setItem('mascot-position', JSON.stringify(position))
  }, [position])

  // 鼠标按下 - 记录起点（不立即开始拖拽）
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // 只响应左键

    const rect = mascotRef.current.getBoundingClientRect()
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    hasMovedRef.current = false
    setMouseDown(true)

    // 互动模式下才允许拖拽
    if (interactMode) {
      e.preventDefault()
    }
  }, [interactMode])

  // 鼠标移动 - 判断是否超过阈值，超过则开始拖拽
  const handleMouseMove = useCallback((e) => {
    if (!dragStartRef.current) return

    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // 超过阈值，开始拖拽
    if (distance > DRAG_THRESHOLD && interactMode) {
      if (!isDragging) {
        setIsDragging(true)
        hasMovedRef.current = true
      }

      const newX = e.clientX - dragOffsetRef.current.x
      const newY = e.clientY - dragOffsetRef.current.y

      // 限制在视口范围内
      const maxX = window.innerWidth - 150
      const maxY = window.innerHeight - 150

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }
  }, [isDragging, interactMode])

  // 鼠标释放 - 结束拖拽
  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null
    setMouseDown(false)
    if (isDragging) {
      setIsDragging(false)
    }
  }, [isDragging])

  // 添加全局鼠标事件监听（mouseDown 时激活）
  useEffect(() => {
    if (mouseDown) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [mouseDown, handleMouseMove, handleMouseUp])

  // 未选择模型时不显示
  if (!hasSelectedModel()) return null

  // 点击看板娘 → 根据模式执行不同操作
  const handleClick = (e) => {
    // 如果发生了拖拽，不触发点击
    if (hasMovedRef.current) {
      hasMovedRef.current = false
      return
    }

    if (interactMode) {
      // 互动模式下：单击（非拖拽）退出互动模式，恢复环状菜单
      toggleInteractMode()
      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      openMenu(x, y)
      return
    }

    // 默认模式：打开环状菜单
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
        navigate('/')
        break
      case 'interact':
        // 切换互动模式
        toggleInteractMode()
        break
      case 'settings':
        // 打开设置面板
        openSettings()
        break
      case 'logs':
        navigate('/logs')
        break
    }
  }

  return (
    <>
      <div
        ref={mascotRef}
        className={`mascot-container ${isDragging ? 'mascot-dragging' : ''} ${interactMode ? 'mascot-interact' : ''}`}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          cursor: interactMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* Live2D 看板娘 */}
        <div className={`mascot-character ${isHovering ? 'mascot-character--hover' : ''}`}>
          <Live2DRenderer
            onHover={setHovering}
            onClick={() => {}}
          />

          {/* Hover 提示 */}
          {isHovering && !isMenuOpen && !isDragging && (
            <div className="mascot-tooltip">
              <span>{interactMode ? '✨ 拖拽我~ 点击恢复菜单' : '❓ 点我互动'}</span>
            </div>
          )}

          {/* 互动模式指示器 */}
          {interactMode && (
            <div className="mascot-interact-badge">
              💖
            </div>
          )}

          {/* 加载指示 */}
          {isLoading && (
            <div className="mascot-loading">
              <div className="mascot-loading-spinner" />
            </div>
          )}
        </div>
      </div>

      {/* 环状菜单（Portal，独立于看板娘容器） */}
      <RadialMenu onItemClick={handleMenuItemClick} />

      {/* 客服对话面板 */}
      {isChatOpen && (
        <div className="mascot-chat-wrapper">
          <ChatPanel embedded={false} onClose={closeChat} />
        </div>
      )}
    </>
  )
}
