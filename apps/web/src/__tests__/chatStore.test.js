/**
 * ChatStore 单元测试
 * 测试客服对话状态管理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock chatService
vi.mock('../services/chatService', () => ({
  chatService: {
    createConversation: vi.fn(),
    getConversationDetail: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

import { chatService } from '../services/chatService'
import zustand from 'zustand'
const create = zustand.create || zustand

function createTestStore() {
  return create((set, get) => ({
    conversation: null,
    messages: [],
    isLoading: false,
    isSending: false,
    isOpen: false,
    error: null,

    openChat: () => set({ isOpen: true }),
    closeChat: () => set({ isOpen: false }),
    toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

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

    sendMessage: async (content) => {
      const { conversation, isSending } = get()
      if (!conversation || !content.trim() || isSending) return

      set({ isSending: true, error: null })

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
        set((s) => {
          const msgs = s.messages.filter((m) => m.id !== tempUserMsg.id)
          if (result.user_message) msgs.push(result.user_message)
          if (result.ai_message) msgs.push(result.ai_message)
          return { messages: msgs, isSending: false, conversation: { ...s.conversation, mode: result.mode } }
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

    reset: () => set({
      conversation: null,
      messages: [],
      isLoading: false,
      isSending: false,
      isOpen: false,
      error: null,
    }),
  }))
}

describe('chatStore', () => {
  let useChatStore

  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore = createTestStore()
  })

  describe('面板开关', () => {
    it('openChat 打开面板', () => {
      useChatStore.getState().openChat()
      expect(useChatStore.getState().isOpen).toBe(true)
    })

    it('closeChat 关闭面板', () => {
      useChatStore.setState({ isOpen: true })
      useChatStore.getState().closeChat()
      expect(useChatStore.getState().isOpen).toBe(false)
    })

    it('toggleChat 切换面板状态', () => {
      useChatStore.getState().toggleChat()
      expect(useChatStore.getState().isOpen).toBe(true)
      useChatStore.getState().toggleChat()
      expect(useChatStore.getState().isOpen).toBe(false)
    })
  })

  describe('initConversation', () => {
    it('首次调用创建对话并加载消息', async () => {
      const mockConversation = { id: 1, mode: 'ai' }
      const mockMessages = [
        { id: 1, sender_type: 'ai', content: '你好！' },
      ]

      chatService.createConversation.mockResolvedValue(mockConversation)
      chatService.getConversationDetail.mockResolvedValue({ messages: mockMessages })

      await useChatStore.getState().initConversation()

      expect(useChatStore.getState().conversation).toEqual(mockConversation)
      expect(useChatStore.getState().messages).toEqual(mockMessages)
      expect(useChatStore.getState().isLoading).toBe(false)
    })

    it('已有对话时不重复创建', async () => {
      useChatStore.setState({ conversation: { id: 1 } })

      await useChatStore.getState().initConversation()

      expect(chatService.createConversation).not.toHaveBeenCalled()
    })

    it('创建失败时设置错误信息', async () => {
      chatService.createConversation.mockRejectedValue(new Error('网络错误'))

      await useChatStore.getState().initConversation()

      expect(useChatStore.getState().error).toBe('网络错误')
      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('sendMessage', () => {
    beforeEach(() => {
      useChatStore.setState({ conversation: { id: 1, mode: 'ai' } })
    })

    it('发送成功后添加用户消息和AI回复', async () => {
      const mockResult = {
        user_message: { id: 10, sender_type: 'user', content: '你好' },
        ai_message: { id: 11, sender_type: 'ai', content: '你好！有什么可以帮您？' },
        mode: 'ai',
      }

      chatService.sendMessage.mockResolvedValue(mockResult)

      await useChatStore.getState().sendMessage('你好')

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('你好')
      expect(messages[1].content).toBe('你好！有什么可以帮您？')
      expect(useChatStore.getState().isSending).toBe(false)
    })

    it('发送失败时显示 fallback 常见问题列表', async () => {
      chatService.sendMessage.mockRejectedValue(new Error('网络超时'))

      await useChatStore.getState().sendMessage('测试消息')

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(1)
      expect(messages[0].sender_type).toBe('ai')
      expect(messages[0].content).toContain('常见问题')
      expect(messages[0].metadata.faq).toHaveLength(6)
      expect(messages[0].metadata._isFallback).toBe(true)
      expect(useChatStore.getState().error).toBe('网络超时')
      expect(useChatStore.getState().isSending).toBe(false)
    })

    it('空消息不发送', async () => {
      await useChatStore.getState().sendMessage('   ')

      expect(chatService.sendMessage).not.toHaveBeenCalled()
    })

    it('没有对话时不发送', async () => {
      useChatStore.setState({ conversation: null })

      await useChatStore.getState().sendMessage('你好')

      expect(chatService.sendMessage).not.toHaveBeenCalled()
    })

    it('发送中不重复发送', async () => {
      useChatStore.setState({ isSending: true })

      await useChatStore.getState().sendMessage('你好')

      expect(chatService.sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('重置所有状态', () => {
      useChatStore.setState({
        conversation: { id: 1 },
        messages: [{ id: 1 }],
        isLoading: true,
        isSending: true,
        isOpen: true,
        error: 'some error',
      })

      useChatStore.getState().reset()

      const state = useChatStore.getState()
      expect(state.conversation).toBeNull()
      expect(state.messages).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.isSending).toBe(false)
      expect(state.isOpen).toBe(false)
      expect(state.error).toBeNull()
    })
  })
})
