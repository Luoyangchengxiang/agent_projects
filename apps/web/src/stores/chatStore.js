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
  isOpen: false,
  error: null,

  // 打开/关闭聊天面板
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  // 初始化对话
  initConversation: async () => {
    const { conversation } = get()
    if (conversation) return

    set({ isLoading: true, error: null })
    try {
      const data = await chatService.createConversation()
      set({ conversation: data, isLoading: false })
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

    // 乐观添加用户消息
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

      // 替换临时消息为真实消息
      set((s) => {
        const msgs = s.messages.filter((m) => m.id !== tempUserMsg.id)
        if (result.user_message) msgs.push(result.user_message)
        if (result.ai_message) msgs.push(result.ai_message)
        return { 
          messages: msgs, 
          isSending: false, 
          conversation: { ...s.conversation, mode: result.mode } 
        }
      })
    } catch (error) {
      // 发送失败：显示 fallback 常见问题列表
      const fallbackMsg = {
        id: Date.now(),
        sender_type: 'ai',
        content: '🤔 抱歉，网络连接出现问题，暂时无法回答你的问题。\n\n📌 **常见问题：**\n1. 如何添加新的 Agent？\n2. 怎么查看 Agent 运行是否正常？\n3. 本地怎么快速登录？\n4. 报错了怎么办？\n5. 如何查看执行日志？\n6. 如何配置定时任务？\n\n💬 你也可以点击下方按钮转接人工客服。',
        created_at: new Date().toISOString(),
        metadata: {
          faq: [
            { q: '如何添加新的 Agent？', a: '在"Agent列表"页面点击"新增"按钮即可创建。' },
            { q: '怎么查看 Agent 运行是否正常？', a: '在"仪表盘"页面可以查看所有 Agent 的运行状态，绿色表示正常。' },
            { q: '本地怎么快速登录？', a: '在本机访问时，用户名输入"admin"，密码输入"123456"即可快捷登录。' },
            { q: '报错了怎么办？', a: '在"错误日志"页面查看错误详情，可以按类型和严重程度筛选。' },
            { q: '如何查看执行日志？', a: '点击左侧菜单"执行日志"即可查看所有 Agent 的执行历史。' },
            { q: '如何配置定时任务？', a: '在"定时任务"页面可以创建、编辑和管理定时任务。' },
          ],
          _isFallback: true,
        },
      }

      set((s) => ({
        messages: [...s.messages.filter((m) => m.id !== tempUserMsg.id), fallbackMsg],
        isSending: false,
        error: error.message,
      }))
    }
  },

  // 重试失败的消息
  retryMessage: async (failedMsgId, content) => {
    const { conversation, isSending } = get()
    if (!conversation || !content.trim() || isSending) return

    set((s) => ({
      messages: s.messages.filter((m) => m.id !== failedMsgId),
      error: null,
    }))

    await get().sendMessage(content)
  },

  // 转人工
  transferToHuman: async () => {
    const { conversation, isSending } = get()
    if (!conversation || isSending) return

    set({ isSending: true, error: null })

    try {
      await chatService.transferToHuman(conversation.id)
      
      // 添加系统消息
      const systemMsg = {
        id: Date.now(),
        sender_type: 'system',
        content: '已通知客服人员，请等待接入...',
        created_at: new Date().toISOString(),
      }
      set((s) => ({ 
        messages: [...s.messages, systemMsg], 
        isSending: false 
      }))
    } catch (error) {
      set({ isSending: false, error: error.message })
    }
  },

  // 清空状态
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
