/**
 * Request模块 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tokenManager } from '../services/tokenManager'

// Mock axios
vi.mock('axios', () => {
  const interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  }
  const instance = {
    interceptors,
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    defaults: { headers: { common: {} } },
  }
  return {
    default: {
      create: vi.fn(() => instance),
      isCancel: vi.fn(() => false),
    },
    isCancel: vi.fn(() => false),
  }
})

describe('tokenManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('Token存储和读取', () => {
    tokenManager.setToken('abc123')
    expect(tokenManager.getToken()).toBe('abc123')
  })

  it('用户信息存储和读取', () => {
    const user = { id: 1, name: '测试用户' }
    tokenManager.setUser(user)
    expect(tokenManager.getUser()).toEqual(user)
  })

  it('hasToken判断', () => {
    expect(tokenManager.hasToken()).toBe(false)
    tokenManager.setToken('token')
    expect(tokenManager.hasToken()).toBe(true)
  })

  it('clearAll清除所有', () => {
    tokenManager.setToken('token')
    tokenManager.setUser({ name: 'test' })
    tokenManager.clearAll()
    expect(tokenManager.getToken()).toBeNull()
    expect(tokenManager.getUser()).toBeNull()
  })
})

describe('request模块配置', () => {
  it('能导入request模块', async () => {
    const request = await import('../services/request')
    expect(request.default).toBeDefined()
    // cancelAllRequests 已移除（简化request.js）
  })
})
