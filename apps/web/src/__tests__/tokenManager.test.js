/**
 * TokenManager 单元测试
 * 包含多用户独立存储 remember_token 的测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tokenManager } from '../services/tokenManager'

describe('tokenManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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

    it('Token过期后返回null', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // 设置Token，1小时后过期
      tokenManager.setToken('test-token', '2024-01-01T13:00:00Z')

      // 还没过期
      expect(tokenManager.getToken()).toBe('test-token')

      // 1小时后
      vi.setSystemTime(new Date('2024-01-01T14:00:00Z'))
      expect(tokenManager.getToken()).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('能清除Token和用户信息', () => {
      tokenManager.setToken('test-token')
      tokenManager.setUser({ name: 'test' })
      tokenManager.clearAuth()
      expect(tokenManager.getToken()).toBeNull()
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

    it('能清除所有 remember_token', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.clearAll()

      expect(tokenManager.getRemember('admin')).toBeNull()
      expect(tokenManager.getRemember('test')).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('清除认证信息但保留 remember_token', () => {
      tokenManager.setToken('test-token')
      tokenManager.setUser({ name: 'test' })
      tokenManager.saveRemember('admin', 'token-admin')

      tokenManager.clearAuth()

      expect(tokenManager.getToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
    })
  })

  // ========== 记住密码相关测试 ==========

  describe('saveRemember / getRemember', () => {
    it('能保存和获取单个用户的 remember_token', () => {
      tokenManager.saveRemember('admin', 'token-admin-123')
      const result = tokenManager.getRemember('admin')

      expect(result).toEqual({ rememberToken: 'token-admin-123' })
    })

    it('能保存多个用户的 remember_token', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.saveRemember('user1', 'token-user1')

      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
      expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })
      expect(tokenManager.getRemember('user1')).toEqual({ rememberToken: 'token-user1' })
    })

    it('覆盖同一用户的 remember_token', () => {
      tokenManager.saveRemember('admin', 'old-token')
      tokenManager.saveRemember('admin', 'new-token')

      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'new-token' })
    })

    it('不同用户的 remember_token 互相独立', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')

      // 清除 admin 的 remember_token
      tokenManager.clearRemember('admin')

      // test 的 remember_token 不受影响
      expect(tokenManager.getRemember('admin')).toBeNull()
      expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })
    })

    it('没有 remember_token 时返回 null', () => {
      expect(tokenManager.getRemember('nonexistent')).toBeNull()
    })

    it('remember_token 过期后返回 null', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // 保存 remember_token，1天后过期
      tokenManager.saveRemember('admin', 'token-admin', 1)

      // 还没过期
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })

      // 2天后
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'))
      expect(tokenManager.getRemember('admin')).toBeNull()
    })

    it('自定义记住天数', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // 保存 remember_token，7天后过期
      tokenManager.saveRemember('admin', 'token-admin', 7)

      // 6天后，还没过期
      vi.setSystemTime(new Date('2024-01-07T12:00:00Z'))
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })

      // 8天后，已过期
      vi.setSystemTime(new Date('2024-01-09T12:00:00Z'))
      expect(tokenManager.getRemember('admin')).toBeNull()
    })
  })

  describe('clearRemember', () => {
    it('能清除指定用户的 remember_token', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.clearRemember('admin')

      expect(tokenManager.getRemember('admin')).toBeNull()
    })

    it('清除不存在的用户不会报错', () => {
      expect(() => tokenManager.clearRemember('nonexistent')).not.toThrow()
    })

    it('清除用户后更新 lastLogin', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.updateLastLogin('admin')

      // 清除 admin
      tokenManager.clearRemember('admin')

      // lastLogin 应该更新为 test
      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered?.login).toBe('test')
    })

    it('清除所有用户后 lastLogin 为 null', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.updateLastLogin('admin')

      tokenManager.clearRemember('admin')

      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered).toBeNull()
    })
  })

  describe('hasRemember', () => {
    it('有 remember_token 时返回 true', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      expect(tokenManager.hasRemember('admin')).toBe(true)
    })

    it('没有 remember_token 时返回 false', () => {
      expect(tokenManager.hasRemember('admin')).toBe(false)
    })

    it('remember_token 过期后返回 false', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      tokenManager.saveRemember('admin', 'token-admin', 1)

      // 2天后
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'))
      expect(tokenManager.hasRemember('admin')).toBe(false)
    })
  })

  describe('getLastRemembered', () => {
    it('返回最后登录的用户信息', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.updateLastLogin('test')

      const result = tokenManager.getLastRemembered()
      expect(result).toEqual({
        login: 'test',
        rememberToken: 'token-test'
      })
    })

    it('没有 remember_token 时返回 null', () => {
      expect(tokenManager.getLastRemembered()).toBeNull()
    })

    it('lastLogin 用户的 remember_token 已过期时返回 null', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      tokenManager.saveRemember('admin', 'token-admin', 1)
      tokenManager.updateLastLogin('admin')

      // 2天后
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'))
      expect(tokenManager.getLastRemembered()).toBeNull()
    })

    it('自动更新 lastLogin 为第一个有效用户', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.updateLastLogin('admin')

      // 清除 admin
      tokenManager.clearRemember('admin')

      // lastLogin 应该自动更新为 test
      const result = tokenManager.getLastRemembered()
      expect(result?.login).toBe('test')
    })
  })

  describe('updateLastLogin', () => {
    it('能更新最后登录用户', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')

      tokenManager.updateLastLogin('admin')
      expect(tokenManager.getLastRemembered()?.login).toBe('admin')

      tokenManager.updateLastLogin('test')
      expect(tokenManager.getLastRemembered()?.login).toBe('test')
    })

    it('更新不存在的用户也可以', () => {
      tokenManager.updateLastLogin('nonexistent')
      expect(tokenManager.getLastRemembered()).toBeNull()
    })
  })

  describe('getAllRememberedUsers', () => {
    it('返回所有有效的用户列表', () => {
      tokenManager.saveRemember('admin', 'token-admin')
      tokenManager.saveRemember('test', 'token-test')
      tokenManager.saveRemember('user1', 'token-user1')

      const users = tokenManager.getAllRememberedUsers()
      expect(users).toContain('admin')
      expect(users).toContain('test')
      expect(users).toContain('user1')
      expect(users.length).toBe(3)
    })

    it('过滤已过期的用户', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      tokenManager.saveRemember('admin', 'token-admin', 7) // 7天后过期
      tokenManager.saveRemember('test', 'token-test', 1)   // 1天后过期

      // 2天后
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'))

      const users = tokenManager.getAllRememberedUsers()
      expect(users).toContain('admin')
      expect(users).not.toContain('test')
      expect(users.length).toBe(1)
    })

    it('没有 remember_token 时返回空数组', () => {
      expect(tokenManager.getAllRememberedUsers()).toEqual([])
    })
  })

  describe('旧版本数据兼容性', () => {
    it('能迁移旧版本数据结构', () => {
      // 模拟旧版本数据结构
      const oldData = {
        login: 'admin',
        rememberToken: 'old-token',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      }
      localStorage.setItem('auth_remember', JSON.stringify(oldData))

      // 重新读取，应该自动迁移
      const result = tokenManager.getRemember('admin')
      expect(result).toEqual({ rememberToken: 'old-token' })
    })
  })

  describe('多用户完整流程', () => {
    it('模拟用户A登录、用户B登录、退出、切换用户', () => {
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // 1. 用户A登录，勾选"记住30天"
      tokenManager.saveRemember('admin', 'token-admin', 30)
      tokenManager.updateLastLogin('admin')

      // 2. 用户B登录，也勾选"记住30天"
      tokenManager.saveRemember('test', 'token-test', 30)
      tokenManager.updateLastLogin('test')

      // 3. 退出登录
      tokenManager.clearAuth()

      // 4. 检查两个用户的 remember_token 都保留
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
      expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })

      // 5. 最后登录的是 test
      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered?.login).toBe('test')
      expect(lastRemembered?.rememberToken).toBe('token-test')

      // 6. 切换到 admin 用户
      tokenManager.updateLastLogin('admin')
      const adminRemembered = tokenManager.getLastRemembered()
      expect(adminRemembered?.login).toBe('admin')
      expect(adminRemembered?.rememberToken).toBe('token-admin')
    })

    it('用户A记住密码，用户B不记住密码', () => {
      // 1. 用户A登录，勾选"记住30天"
      tokenManager.saveRemember('admin', 'token-admin', 30)
      tokenManager.updateLastLogin('admin')

      // 2. 用户B登录，不勾选"记住30天"
      tokenManager.clearRemember('test') // 确保没有 remember_token
      tokenManager.updateLastLogin('test')

      // 3. 退出登录
      tokenManager.clearAuth()

      // 4. 用户A的 remember_token 保留
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })

      // 5. 用户B没有 remember_token
      expect(tokenManager.getRemember('test')).toBeNull()

      // 6. 最后登录的是 test，但没有 remember_token
      const lastRemembered = tokenManager.getLastRemembered()
      expect(lastRemembered).toBeNull() // test 没有 remember_token
    })

    it('三个用户独立存储，清除一个不影响其他', () => {
      tokenManager.saveRemember('admin', 'token-admin', 30)
      tokenManager.saveRemember('test', 'token-test', 30)
      tokenManager.saveRemember('user1', 'token-user1', 30)

      // 清除 test
      tokenManager.clearRemember('test')

      // admin 和 user1 不受影响
      expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
      expect(tokenManager.getRemember('test')).toBeNull()
      expect(tokenManager.getRemember('user1')).toEqual({ rememberToken: 'token-user1' })

      // 所有有效用户列表
      const users = tokenManager.getAllRememberedUsers()
      expect(users).toContain('admin')
      expect(users).not.toContain('test')
      expect(users).toContain('user1')
      expect(users.length).toBe(2)
    })
  })
})
