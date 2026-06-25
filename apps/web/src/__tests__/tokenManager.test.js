/**
 * TokenManager 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { tokenManager } from '../services/tokenManager'

describe('tokenManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getToken / setToken', () => {
    it('没有Token时返回null', () => {
      expect(tokenManager.getToken()).toBeNull()
    })

    it('能正确存储和读取Token', () => {
      tokenManager.setToken('test-token-123')
      expect(tokenManager.getToken()).toBe('test-token-123')
    })

    it('能覆盖已有的Token', () => {
      tokenManager.setToken('old-token')
      tokenManager.setToken('new-token')
      expect(tokenManager.getToken()).toBe('new-token')
    })
  })

  describe('clearToken', () => {
    it('能清除Token', () => {
      tokenManager.setToken('test-token')
      tokenManager.clearToken()
      expect(tokenManager.getToken()).toBeNull()
    })

    it('能同时清除用户信息', () => {
      tokenManager.setUser({ name: 'test' })
      tokenManager.clearToken()
      expect(tokenManager.getUser()).toBeNull()
    })
  })

  describe('getUser / setUser', () => {
    it('没有用户信息时返回null', () => {
      expect(tokenManager.getUser()).toBeNull()
    })

    it('能正确存储和读取用户信息', () => {
      const user = { id: 1, name: '管理员', email: 'admin@local', role: 'admin' }
      tokenManager.setUser(user)
      expect(tokenManager.getUser()).toEqual(user)
    })

    it('能覆盖已有的用户信息', () => {
      tokenManager.setUser({ name: 'old' })
      tokenManager.setUser({ name: 'new' })
      expect(tokenManager.getUser()).toEqual({ name: 'new' })
    })
  })

  describe('hasToken', () => {
    it('没有Token时返回false', () => {
      expect(tokenManager.hasToken()).toBe(false)
    })

    it('有Token时返回true', () => {
      tokenManager.setToken('test-token')
      expect(tokenManager.hasToken()).toBe(true)
    })
  })

  describe('clearAll', () => {
    it('能清除所有认证信息', () => {
      tokenManager.setToken('test-token')
      tokenManager.setUser({ name: 'test' })
      tokenManager.clearAll()
      expect(tokenManager.getToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
    })
  })
})
