/**
 * 客服对话API服务
 * 封装所有客服相关接口调用
 */
import request from './request'

export const chatService = {
  /**
   * 创建对话（或获取活跃对话）
   */
  async createConversation() {
    const res = await request.post('/chat/conversations')
    return res.data
  },

  /**
   * 获取对话列表（管理后台用）
   */
  async getConversations(params = {}) {
    const res = await request.get('/chat/conversations', { params })
    return res.data
  },

  /**
   * 获取对话详情（含消息历史）
   */
  async getConversationDetail(id) {
    const res = await request.get(`/chat/conversations/${id}`)
    return res
  },

  /**
   * 发送消息
   */
  async sendMessage(conversationId, content) {
    const res = await request.post('/chat/messages', {
      conversation_id: conversationId,
      content,
    })
    return res.data
  },

  /**
   * 人工接管对话
   */
  async takeover(conversationId) {
    const res = await request.post('/chat/takeover', {
      conversation_id: conversationId,
    })
    return res
  },

  /**
   * 释放对话给AI
   */
  async release(conversationId) {
    const res = await request.post('/chat/release', {
      conversation_id: conversationId,
    })
    return res
  },

  /**
   * 关闭对话
   */
  async close(conversationId) {
    const res = await request.post('/chat/close', {
      conversation_id: conversationId,
    })
    return res
  },

  /**
   * 人工客服回复
   */
  async humanReply(conversationId, content) {
    const res = await request.post('/chat/human-reply', {
      conversation_id: conversationId,
      content,
    })
    return res.data
  },

  /**
   * 转人工
   */
  async transferToHuman(conversationId) {
    const res = await request.post('/chat/transfer-human', {
      conversation_id: conversationId,
    })
    return res.data
  },

  /**
   * 获取客服系统状态
   */
  async getStatus() {
    const res = await request.get('/chat/status')
    return res.data
  },
}
