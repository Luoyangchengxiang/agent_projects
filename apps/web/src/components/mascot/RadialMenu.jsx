/**
 * 环状交互菜单组件
 * 围绕看板娘展开，自动检测边界保持可视
 */
import { useEffect, useRef } from 'react'
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
  const { isMenuOpen, menuPosition, closeMenu } = useMascotStore()
  const menuRef = useRef(null)

  // 点击外部关闭
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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

  return (
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

        return (
          <button
            key={item.id}
            className="radial-menu-item"
            style={{
              transform: `translate(${x}px, ${y}px)`,
              '--item-color': item.color,
              animationDelay: `${index * 0.05}s`,
            }}
            onClick={() => onItemClick?.(item.id)}
            title={item.label}
          >
            <span className="radial-menu-item-icon">{item.icon}</span>
            <span className="radial-menu-item-label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
