/**
 * 看板娘主组件
 * 整合 Live2D 渲染、环状菜单、客服对话
 */
import { useEffect } from 'react'
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

  // 未选择模型时不显示
  if (!hasSelectedModel()) return null

  // 点击看板娘 → 打开环状菜单
  const handleClick = (e) => {
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
    <div className="mascot-container">
      {/* Live2D 看板娘 */}
      <div
        className={`mascot-character ${isHovering ? 'mascot-character--hover' : ''}`}
        onClick={handleClick}
      >
        <Live2DRenderer
          onHover={setHovering}
          onClick={() => handleClick({ currentTarget: document.querySelector('.mascot-character') })}
        />

        {/* Hover 提示 */}
        {isHovering && !isMenuOpen && (
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
