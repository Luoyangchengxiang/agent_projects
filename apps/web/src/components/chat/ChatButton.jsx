/**
 * 客服悬浮按钮 + 聊天面板入口
 * 可独立使用，后续集成到看板娘环状菜单
 */
import { MessageOutlined } from '@ant-design/icons'
import useChatStore from '../../stores/chatStore'
import ChatPanel from './ChatPanel'

export default function ChatButton() {
  const { isOpen, toggleChat, closeChat, reset } = useChatStore()

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={toggleChat}
          title="联系客服"
        >
          <MessageOutlined />
          <span className="chat-fab-label">客服</span>
        </button>
      )}

      {/* 聊天面板 */}
      {isOpen && <ChatPanel onClose={closeChat} />}
    </>
  )
}
