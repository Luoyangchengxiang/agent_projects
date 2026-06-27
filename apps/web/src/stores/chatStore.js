/**
 * 客服对话状态管理（Zustand）
 * 管理对话、消息、发送状态
 */
import create from 'zustand'
import { chatService } from '../services/chatService'

const useChatStore = create((set, get) => ({
  // 状态
  conversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isOpen: false,       // 聊天面板是否打开
  error: null,

  // 打开/关闭聊天面板
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  // 初始化对话（打开面板时调用）
  initConversation: async () => {
    const { conversation } = get()
    if (conversation) return // 已有对话，不重复创建

    set({ isLoading: true, error: null })
    try {
      const data = await chatService.createConversation()
      set({
        conversation: data,
        isLoading: false,
      })
      // 加载消息历史
      await get().loadMessages()
    } catch (error) {
      set({ isLoading: false, error: error.message })
    }
  },

  // 加载消息历史
  loadMessages: async () => {
    const { conversation } = get()
    if (!conversation) return

    try {
      const res = await chatService.getConversationDetail(conversation.id)
      set({ messages: res.messages || [] })
    } catch (error) {
      console.error('加载消息失败:', error)
    }
  },

  // 发送消息
  sendMessage: async (content) => {
    const { conversation, isSending } = get()
    if (!conversation || !content.trim() || isSending) return

    set({ isSending: true, error: null })

    // 先乐观添加用户消息到列表
    const tempUserMsg = {
      id: Date.now(),
      sender_type: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      _sending: true,
    }
    set((s) => ({ messages: [...s.messages, tempUserMsg] }))

    try {
      const result = await chatService.sendMessage(conversation.id, content.trim())

      // 替换临时消息为真实消息，添加AI回复
      set((s) => {
        const msgs = s.messages.filter((m) => m.id !== tempUserMsg.id)
        if (result.user_message) msgs.push(result.user_message)
        if (result.ai_message) msgs.push(result.ai_message)
        return { messages: msgs, isSending: false, conversation: { ...s.conversation, mode: result.mode } }
      })
    } catch (error) {
      // 发送失败：标记临时消息为失败，保留显示
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === tempUserMsg.id ? { ...m, _failed: true } : m
        ),
        isSending: false,
        error: error.message,
      }))
    }
  },

  // 重试失败的消息（只移除当前要重试的那条，不影响其他失败消息）
  retryMessage: async (failedMsgId, content) => {
    const { conversation, isSending } = get()
    if (!conversation || !content.trim() || isSending) return

    // 只移除当前要重试的失败消息
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== failedMsgId),
      error: null,
    }))

    // 重新发送
    await get().sendMessage(content)
  },

  // 清空状态（退出登录时调用）
  reset: () => set({
    conversation: null,
    messages: [],
    isLoading: false,
    isSending: false,
    isOpen: false,
    error: null,
  }),
}))

export default useChatStore
