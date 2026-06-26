/**
 * 环状交互菜单组件（独立模块）
 * 通过 Portal 挂载到 body，使用 store 的 menuPosition 定位
 * 与看板娘类型完全解耦
 */
import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageOutlined,
  DashboardOutlined,
  SettingOutlined,
  HeartOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import useMascotStore from '../../stores/mascotStore'
import './radial-menu.css'

const MENU_ITEMS = [
  { id: 'chat', icon: <MessageOutlined />, label: '客服对话', color: '#00d4ff', angle: -90 },
  { id: 'status', icon: <DashboardOutlined />, label: '系统状态', color: '#52c41a', angle: -30 },
  { id: 'interact', icon: <HeartOutlined />, label: '互动', color: '#ff6b9d', angle: 30 },
  { id: 'settings', icon: <SettingOutlined />, label: '设置', color: '#faad14', angle: 150 },
  { id: 'logs', icon: <FileTextOutlined />, label: '日志', color: '#6c3ff5', angle: 210 },
]

export default function RadialMenu({ onItemClick }) {
  const { isMenuOpen, menuPosition, closeMenu, interactMode } = useMascotStore()
  const menuRef = useRef(null)
  const cleanupRef = useRef(null)

  // 点击外部关闭（延迟注册，避免和打开菜单的同一次点击冲突）
  useEffect(() => {
    // 清理上一次的监听器
    cleanupRef.current?.()
    cleanupRef.current = null

    if (!isMenuOpen) return

    // 延迟一个事件循环注册，确保不会捕获到触发菜单打开的那次 click
    const timer = setTimeout(() => {
      const handleClick = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          closeMenu()
        }
      }
      document.addEventListener('click', handleClick)
      cleanupRef.current = () => document.removeEventListener('click', handleClick)
    }, 10)

    return () => {
      clearTimeout(timer)
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [isMenuOpen, closeMenu])

  // ESC 关闭
  useEffect(() => {
    if (!isMenuOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isMenuOpen, closeMenu])

  if (!isMenuOpen) return null

  const radius = 100 // 菜单半径

  const menuContent = (
    <div
      ref={menuRef}
      className="radial-menu"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
      }}
    >
      {/* 中心装饰 */}
      <div className="radial-menu-center" />

      {/* 菜单项 */}
      {MENU_ITEMS.map((item, index) => {
        const rad = (item.angle * Math.PI) / 180
        const x = Math.cos(rad) * radius
        const y = Math.sin(rad) * radius

        // 互动按钮根据模式显示不同状态
        const isActive = item.id === 'interact' && interactMode

        return (
          <button
            key={item.id}
            className={`radial-menu-item ${isActive ? 'radial-menu-item--active' : ''}`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              '--item-color': item.color,
              animationDelay: `${index * 0.05}s`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onItemClick?.(item.id)
            }}
            title={item.label}
          >
            <span className="radial-menu-item-icon">{item.icon}</span>
            <span className="radial-menu-item-label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )

  // 通过 Portal 挂载到 body，完全脱离看板娘容器
  return createPortal(menuContent, document.body)
}
