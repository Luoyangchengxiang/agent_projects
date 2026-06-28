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
        remember: false,
      })
      expect(result.user).toEqual(mockRes.data.user)
      expect(result.token).toBe('abc123')
      expect(tokenManager.getToken()).toBe('abc123')
      expect(tokenManager.getUser()).toEqual(mockRes.data.user)
    })

    it('登录时勾选"记住30天"，保存 remember_token', async () => {
      const mockRes = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-123',
          remember_token: 'remember-abc',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockRes)

      await authService.login('admin', 'password123', true)

      expect(request.post).toHaveBeenCalledWith('/auth/login', {
        login: 'admin',
        password: 'password123',
        remember: true,
      })
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-abc' })
    })

    it('登录时不勾选"记住30天"，清除该用户的 remember_token', async () => {
      // 先保存一个 remember_token
      tokenManager.saveRemember('admin', 'old-remember-token')

      const mockRes = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-123',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockRes)

      await authService.login('admin', 'password123', false)

      expect(tokenManager.getRemember('admin')).toBeNull()
    })

    it('登录时更新 lastLogin', async () => {
      const mockRes = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-123',
          remember_token: 'remember-abc',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockRes)

      await authService.login('admin', 'password123', true)

      expect(tokenManager.getLastRemembered()?.login).toBe('admin')
    })

    it('用户A登录后，用户B登录，两个用户的 remember_token 都保留', async () => {
      // 用户A登录
      const mockResA = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-admin',
          remember_token: 'remember-admin',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResA)
      await authService.login('admin', 'password123', true)

      // 用户B登录
      const mockResB = {
        data: {
          user: { id: 2, name: '测试用户', email: 'test@local' },
          token: 'token-test',
          remember_token: 'remember-test',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResB)
      await authService.login('test', 'password456', true)

      // 两个用户的 remember_token 都保留
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-admin' })
      expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'remember-test' })

      // lastLogin 是 test
      expect(tokenManager.getLastRemembered()?.login).toBe('test')
    })

    it('后端返回 remember_token 时，无论 remember 参数如何都保存', async () => {
      const mockRes = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-123',
          remember_token: 'remember-abc',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockRes)

      // remember = false，但后端返回了 remember_token
      await authService.login('admin', 'password123', false)

      // 仍然保存 remember_token
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-abc' })
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

    it('退出登录保留 remember_token', async () => {
      tokenManager.setToken('token')
      tokenManager.setUser({ name: 'admin' })
      tokenManager.saveRemember('admin', 'remember-token')
      request.post.mockResolvedValue({})

      await authService.logout()

      expect(tokenManager.getToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-token' })
    })

    it('退出登录后，其他用户的 remember_token 不受影响', async () => {
      tokenManager.setToken('token')
      tokenManager.setUser({ name: 'test' })
      tokenManager.saveRemember('admin', 'remember-admin')
      tokenManager.saveRemember('test', 'remember-test')
      request.post.mockResolvedValue({})

      await authService.logout()

      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-admin' })
      expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'remember-test' })
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

  describe('记住密码完整流程', () => {
    it('用户A记住密码 -> 退出 -> 用户B记住密码 -> 退出 -> 自动填充用户B', async () => {
      // 1. 用户A登录，勾选"记住30天"
      const mockResA = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-admin',
          remember_token: 'remember-admin',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResA)
      await authService.login('admin', 'password123', true)

      // 2. 退出登录
      request.post.mockResolvedValue({})
      await authService.logout()

      // 3. 用户B登录，勾选"记住30天"
      const mockResB = {
        data: {
          user: { id: 2, name: '测试用户', email: 'test@local' },
          token: 'token-test',
          remember_token: 'remember-test',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResB)
      await authService.login('test', 'password456', true)

      // 4. 退出登录
      await authService.logout()

      // 5. 检查自动填充 - 应该是用户B
      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered?.login).toBe('test')
      expect(lastRemembered?.rememberToken).toBe('remember-test')

      // 6. 用户A的 remember_token 也保留
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-admin' })
    })

    it('用户A记住密码 -> 用户B不记住 -> 退出 -> 自动填充用户A', async () => {
      // 1. 用户A登录，勾选"记住30天"
      const mockResA = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-admin',
          remember_token: 'remember-admin',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResA)
      await authService.login('admin', 'password123', true)

      // 2. 用户B登录，不勾选"记住30天"
      const mockResB = {
        data: {
          user: { id: 2, name: '测试用户', email: 'test@local' },
          token: 'token-test',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResB)
      await authService.login('test', 'password456', false)

      // 3. 退出登录
      request.post.mockResolvedValue({})
      await authService.logout()

      // 4. 检查自动填充 - 用户B没有 remember_token，所以返回 null
      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered).toBeNull()

      // 5. 用户A的 remember_token 保留
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'remember-admin' })

      // 6. 用户B没有 remember_token
      expect(tokenManager.getRemember('test')).toBeNull()
    })

    it('切换用户时自动更新 lastLogin', async () => {
      // 1. 用户A登录
      const mockResA = {
        data: {
          user: { id: 1, name: '管理员', email: 'admin@local' },
          token: 'token-admin',
          remember_token: 'remember-admin',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResA)
      await authService.login('admin', 'password123', true)

      expect(tokenManager.getLastRemembered()?.login).toBe('admin')

      // 2. 用户B登录
      const mockResB = {
        data: {
          user: { id: 2, name: '测试用户', email: 'test@local' },
          token: 'token-test',
          remember_token: 'remember-test',
          is_local_login: true,
        },
      }
      request.post.mockResolvedValue(mockResB)
      await authService.login('test', 'password456', true)

      expect(tokenManager.getLastRemembered()?.login).toBe('test')
    })
  })
})
