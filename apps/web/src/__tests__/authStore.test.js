/**
 * AuthStore 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock authService 和 tokenManager（必须在 import 之前）
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    isLoggedIn: vi.fn(),
    getCachedUser: vi.fn(),
  },
}))

vi.mock('../services/tokenManager', () => ({
  tokenManager: {
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getUser: vi.fn(() => null),
    setUser: vi.fn(),
    hasToken: vi.fn(() => false),
    clearAll: vi.fn(),
  },
}))

import { authService } from '../services/authService'
import { tokenManager } from '../services/tokenManager'

// Zustand 的 CJS 导出中 create 是 default export
import zustand from 'zustand'
const create = zustand.create || zustand

// 用独立的 store 实例做测试，避免模块缓存
function createTestStore() {
  return create((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (email, password) => {
      set({ isLoading: true, error: null })
      try {
        const result = await authService.login(email, password)
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
        return result
      } catch (error) {
        set({ isLoading: false, error: error.message })
        throw error
      }
    },

    register: async (params) => {
      set({ isLoading: true, error: null })
      try {
        const result = await authService.register(params)
        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
        return result
      } catch (error) {
        set({ isLoading: false, error: error.message })
        throw error
      }
    },

    logout: async () => {
      set({ isLoading: true })
      try {
        await authService.logout()
      } catch {
        // 即使API失败也清除本地状态
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    },

    refreshUser: async () => {
      try {
        const user = await authService.getCurrentUser()
        set({ user, isAuthenticated: true })
      } catch {
        tokenManager.clearAll()
        set({ user: null, isAuthenticated: false })
      }
    },

    clearError: () => set({ error: null }),

    init: async () => {
      const { isInitialized, isAuthenticated } = get()
      
      if (isInitialized) {
        return
      }
      
      const hasToken = tokenManager.hasToken()
      
      // 如果已经通过 login() 登录成功，跳过初始化
      if (isAuthenticated) {
        set({ isInitialized: true })
        return
      }
      
      if (hasToken) {
        const cachedUser = tokenManager.getUser()
        if (cachedUser) {
          set({ user: cachedUser, isAuthenticated: true })
        }
        
        try {
          const user = await authService.getCurrentUser()
          set({ user, isAuthenticated: true })
        } catch (error) {
          if (!cachedUser) {
            tokenManager.clearAll()
            set({ user: null, isAuthenticated: false })
          }
        }
      } else {
        // 再次检查，防止 login() 在 init() 执行期间设置了 token
        const currentToken = tokenManager.hasToken()
        if (!currentToken) {
          set({ user: null, isAuthenticated: false })
        } else {
          // 如果 init 期间有了新 token，尝试获取用户信息
          const cachedUser = tokenManager.getUser()
          if (cachedUser) {
            set({ user: cachedUser, isAuthenticated: true })
          }
        }
      }
      
      set({ isInitialized: true })
    },
  }))
}

describe('authStore', () => {
  let useAuthStore

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useAuthStore = createTestStore()
  })

  describe('login', () => {
    it('登录成功后更新状态', async () => {
      const mockUser = { id: 1, name: '管理员', email: 'admin@local', role: 'admin' }
      const mockResult = { user: mockUser, token: 'test-token', is_local_login: true }

      authService.login.mockResolvedValue(mockResult)

      const result = await useAuthStore.getState().login('admin', '123456')

      expect(result).toEqual(mockResult)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('登录失败时设置错误信息', async () => {
      authService.login.mockRejectedValue(new Error('邮箱或密码错误'))

      try {
        await useAuthStore.getState().login('wrong', 'wrong')
      } catch (e) {
        expect(e.message).toBe('邮箱或密码错误')
      }

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().error).toBe('邮箱或密码错误')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('登录过程中设置loading状态', async () => {
      let resolveLogin
      authService.login.mockImplementation(() => new Promise((r) => { resolveLogin = r }))

      const loginPromise = useAuthStore.getState().login('admin', '123456')

      await new Promise((r) => setTimeout(r, 0))
      expect(useAuthStore.getState().isLoading).toBe(true)

      resolveLogin({ user: { id: 1 }, token: 'token', is_local_login: false })
      await loginPromise

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('注册成功后更新状态', async () => {
      const mockUser = { id: 2, name: '新用户', email: 'new@test.com', role: 'user' }
      const mockResult = { user: mockUser, token: 'new-token' }

      authService.register.mockResolvedValue(mockResult)

      const result = await useAuthStore.getState().register({
        name: '新用户',
        email: 'new@test.com',
        password: 'password123',
      })

      expect(result).toEqual(mockResult)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('注册失败时设置错误信息', async () => {
      authService.register.mockRejectedValue(new Error('该邮箱已被注册'))

      try {
        await useAuthStore.getState().register({ name: 'test', email: 'dup@test.com', password: '12345678' })
      } catch (e) {
        expect(e.message).toBe('该邮箱已被注册')
      }

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().error).toBe('该邮箱已被注册')
    })
  })

  describe('logout', () => {
    it('退出后清除状态', async () => {
      useAuthStore.setState({ user: { id: 1 }, isAuthenticated: true })
      authService.logout.mockResolvedValue()

      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('即使API失败也清除本地状态', async () => {
      useAuthStore.setState({ user: { id: 1 }, isAuthenticated: true })
      authService.logout.mockRejectedValue(new Error('网络错误'))

      await useAuthStore.getState().logout()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('refreshUser', () => {
    it('刷新成功更新用户信息', async () => {
      const mockUser = { id: 1, name: '管理员', email: 'admin@local' }
      authService.getCurrentUser.mockResolvedValue(mockUser)

      await useAuthStore.getState().refreshUser()

      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('Token失效时清除状态', async () => {
      useAuthStore.setState({ user: { id: 1 }, isAuthenticated: true })
      authService.getCurrentUser.mockRejectedValue(new Error('401'))

      await useAuthStore.getState().refreshUser()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('clearError', () => {
    it('能清除错误信息', () => {
      useAuthStore.setState({ error: 'some error' })
      useAuthStore.getState().clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('init (竞态条件防护)', () => {
    it('已登录时跳过初始化', async () => {
      // 模拟已经通过 login() 登录成功
      useAuthStore.setState({ isAuthenticated: true, isInitialized: false })
      
      await useAuthStore.getState().init()
      
      // 应该跳过初始化，直接标记为已初始化
      expect(useAuthStore.getState().isInitialized).toBe(true)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(authService.getCurrentUser).not.toHaveBeenCalled()
    })

    it('有token时尝试刷新用户信息', async () => {
      const mockUser = { id: 1, name: '管理员', email: 'admin@local' }
      tokenManager.hasToken.mockReturnValue(true)
      tokenManager.getUser.mockReturnValue(mockUser)
      authService.getCurrentUser.mockResolvedValue(mockUser)
      
      useAuthStore.setState({ isAuthenticated: false, isInitialized: false })
      
      await useAuthStore.getState().init()
      
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })

    it('无token时设置未登录状态', async () => {
      tokenManager.hasToken.mockReturnValue(false)
      
      useAuthStore.setState({ isAuthenticated: false, isInitialized: false })
      
      await useAuthStore.getState().init()
      
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })

    it('init期间login()设置token后不清除状态', async () => {
      const mockUser = { id: 1, name: '管理员', email: 'admin@local' }
      
      // 模拟 init() 开始时没有 token
      tokenManager.hasToken.mockReturnValueOnce(false)
      
      // 但第二次检查时有 token（模拟 login() 在 init() 期间设置了 token）
      tokenManager.hasToken.mockReturnValueOnce(true)
      
      // 模拟有缓存的用户信息
      tokenManager.getUser.mockReturnValue(mockUser)
      
      useAuthStore.setState({ isAuthenticated: false, isInitialized: false })
      
      await useAuthStore.getState().init()
      
      // 应该保留登录状态，不被清除
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).toEqual(mockUser)
      expect(useAuthStore.getState().isInitialized).toBe(true)
    })
  })
})
