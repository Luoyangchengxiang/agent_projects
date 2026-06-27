import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import request from '../services/request'
import { chatService } from '../services/chatService'

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createConversation', () => {
    it('创建对话', async () => {
      const mock = { id: 1, status: 'active' }
      request.post.mockResolvedValue({ data: mock })

      const result = await chatService.createConversation()

      expect(request.post).toHaveBeenCalledWith('/chat/conversations')
      expect(result).toEqual(mock)
    })
  })

  describe('getConversations', () => {
    it('获取对话列表', async () => {
      const mock = [{ id: 1 }, { id: 2 }]
      request.get.mockResolvedValue({ data: mock })

      const result = await chatService.getConversations({ page: 1 })

      expect(request.get).toHaveBeenCalledWith('/chat/conversations', { params: { page: 1 } })
      expect(result).toEqual(mock)
    })

    it('无参数时传空对象', async () => {
      request.get.mockResolvedValue({ data: [] })
      await chatService.getConversations()
      expect(request.get).toHaveBeenCalledWith('/chat/conversations', { params: {} })
    })
  })

  describe('getConversationDetail', () => {
    it('获取对话详情', async () => {
      const mock = { data: { id: 1, messages: [] } }
      request.get.mockResolvedValue(mock)

      const result = await chatService.getConversationDetail(1)

      expect(request.get).toHaveBeenCalledWith('/chat/conversations/1')
      expect(result).toEqual(mock)
    })
  })

  describe('sendMessage', () => {
    it('发送消息', async () => {
      const mock = { id: 1, content: '你好' }
      request.post.mockResolvedValue({ data: mock })

      const result = await chatService.sendMessage(1, '你好')

      expect(request.post).toHaveBeenCalledWith('/chat/messages', {
        conversation_id: 1,
        content: '你好',
      })
      expect(result).toEqual(mock)
    })
  })

  describe('takeover', () => {
    it('人工接管对话', async () => {
      request.post.mockResolvedValue({ data: { success: true } })

      await chatService.takeover(1)

      expect(request.post).toHaveBeenCalledWith('/chat/takeover', {
        conversation_id: 1,
      })
    })
  })

  describe('release', () => {
    it('释放对话给 AI', async () => {
      request.post.mockResolvedValue({ data: { success: true } })

      await chatService.release(1)

      expect(request.post).toHaveBeenCalledWith('/chat/release', {
        conversation_id: 1,
      })
    })
  })

  describe('close', () => {
    it('关闭对话', async () => {
      request.post.mockResolvedValue({ data: { success: true } })

      await chatService.close(1)

      expect(request.post).toHaveBeenCalledWith('/chat/close', {
        conversation_id: 1,
      })
    })
  })

  describe('humanReply', () => {
    it('人工客服回复', async () => {
      const mock = { id: 2, content: '已处理' }
      request.post.mockResolvedValue({ data: mock })

      const result = await chatService.humanReply(1, '已处理')

      expect(request.post).toHaveBeenCalledWith('/chat/human-reply', {
        conversation_id: 1,
        content: '已处理',
      })
      expect(result).toEqual(mock)
    })
  })

  describe('getStatus', () => {
    it('获取客服系统状态', async () => {
      const mock = { online: true, queue_length: 0 }
      request.get.mockResolvedValue({ data: mock })

      const result = await chatService.getStatus()

      expect(request.get).toHaveBeenCalledWith('/chat/status')
      expect(result).toEqual(mock)
    })
  })
})
