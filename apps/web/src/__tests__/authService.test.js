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
import { tokenManager } from '../services/tokenManager'
import { authService } from '../services/authService'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('login', () => {
    it('登录成功后存储 token 和用户信息', async () => {
      const mockRes = {
        data: {
          user: { id: 1, name: '测试用户', email: 'test@test.com' },
          token: 'abc123',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockRes)

      const result = await authService.login('test@test.com', 'password123')

      expect(request.post).toHaveBeenCalledWith('/auth/login', {
        login: 'test@test.com',
        password: 'password123',
      })
      expect(result.user).toEqual(mockRes.data.user)
      expect(result.token).toBe('abc123')
      expect(tokenManager.getToken()).toBe('abc123')
      expect(tokenManager.getUser()).toEqual(mockRes.data.user)
    })
  })

  describe('register', () => {
    it('注册成功后自动登录', async () => {
      const mockRes = {
        data: {
          user: { id: 1, name: '新用户', email: 'new@test.com' },
          token: 'xyz789',
        },
      }
      request.post.mockResolvedValue(mockRes)

      const result = await authService.register({
        name: '新用户',
        email: 'new@test.com',
        password: 'pass123',
      })

      expect(request.post).toHaveBeenCalledWith('/auth/register', {
        name: '新用户',
        email: 'new@test.com',
        password: 'pass123',
        password_confirmation: 'pass123',
      })
      expect(tokenManager.getToken()).toBe('xyz789')
      expect(tokenManager.getUser()).toEqual(mockRes.data.user)
    })
  })

  describe('getCurrentUser', () => {
    it('获取当前用户并更新缓存', async () => {
      const mockUser = { id: 1, name: '用户' }
      request.get.mockResolvedValue({ data: { user: mockUser } })

      const user = await authService.getCurrentUser()

      expect(request.get).toHaveBeenCalledWith('/auth/me')
      expect(user).toEqual(mockUser)
      expect(tokenManager.getUser()).toEqual(mockUser)
    })
  })

  describe('logout', () => {
    it('退出登录清除本地状态', async () => {
      tokenManager.setToken('token')
      tokenManager.setUser({ name: 'test' })
      request.post.mockResolvedValue({})

      await authService.logout()

      expect(request.post).toHaveBeenCalledWith('/auth/logout')
      expect(tokenManager.getToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
    })

    it('API 失败也清除本地状态', async () => {
      tokenManager.setToken('token')
      tokenManager.setUser({ name: 'test' })
      request.post.mockRejectedValue(new Error('网络错误'))

      await authService.logout()

      expect(tokenManager.getToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
    })
  })

  describe('updatePassword', () => {
    it('修改密码', async () => {
      request.put.mockResolvedValue({ data: { success: true } })

      await authService.updatePassword({
        current_password: 'old',
        password: 'new',
      })

      expect(request.put).toHaveBeenCalledWith('/auth/password', {
        current_password: 'old',
        password: 'new',
        password_confirmation: 'new',
      })
    })
  })

  describe('isLoggedIn', () => {
    it('有 token 返回 true', () => {
      tokenManager.setToken('token')
      expect(authService.isLoggedIn()).toBe(true)
    })

    it('无 token 返回 false', () => {
      expect(authService.isLoggedIn()).toBe(false)
    })
  })

  describe('getCachedUser', () => {
    it('返回缓存的用户信息', () => {
      const user = { id: 1, name: 'test' }
      tokenManager.setUser(user)
      expect(authService.getCachedUser()).toEqual(user)
    })

    it('无缓存返回 null', () => {
      expect(authService.getCachedUser()).toBeNull()
    })
  })
})
