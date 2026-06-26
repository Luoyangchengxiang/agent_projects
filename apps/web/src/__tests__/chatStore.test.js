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
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== tempUserMsg.id),
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

    it('发送失败时移除临时消息并设置错误', async () => {
      chatService.sendMessage.mockRejectedValue(new Error('发送失败'))

      await useChatStore.getState().sendMessage('测试消息')

      expect(useChatStore.getState().messages).toHaveLength(0)
      expect(useChatStore.getState().error).toBe('发送失败')
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
