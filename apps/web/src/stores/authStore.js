/**
 * 认证状态管理（Zustand）
 * 全局管理用户登录状态、用户信息
 */

import create from 'zustand'
import { authService } from '../services/authService'
import { tokenManager } from '../services/tokenManager'

// 标记是否正在初始化
let initializing = false

const useAuthStore = create((set, get) => ({
  // 状态
  user: tokenManager.getUser(),
  isAuthenticated: tokenManager.hasToken(),
  isLoading: false,
  error: null,

  // 登录
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const result = await authService.login(email, password)
      console.log('[AuthStore] 登录成功:', result)
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return result
    } catch (error) {
      console.error('[AuthStore] 登录失败:', error)
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  // 注册
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

  // 退出登录
  logout: async () => {
    set({ isLoading: true })
    await authService.logout()
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },

  // 刷新用户信息
  refreshUser: async () => {
    try {
      const user = await authService.getCurrentUser()
      set({ user, isAuthenticated: true })
    } catch (error) {
      console.error('[AuthStore] 刷新用户信息失败:', error)
      tokenManager.clearAll()
      set({ user: null, isAuthenticated: false })
    }
  },

  // 清除错误
  clearError: () => set({ error: null }),

  // 初始化（应用启动时调用）
  init: async () => {
    // 防止重复初始化
    if (initializing) {
      console.log('[AuthStore] 已经在初始化中，跳过')
      return
    }
    
    const hasToken = tokenManager.hasToken()
    console.log('[AuthStore] 初始化, hasToken:', hasToken)
    
    if (hasToken) {
      initializing = true
      
      // 先从缓存获取用户信息
      const cachedUser = tokenManager.getUser()
      if (cachedUser) {
        console.log('[AuthStore] 使用缓存的用户信息:', cachedUser)
        set({ user: cachedUser, isAuthenticated: true })
      }
      
      // 然后尝试刷新用户信息（不阻塞）
      try {
        const user = await authService.getCurrentUser()
        console.log('[AuthStore] 刷新用户信息成功:', user)
        set({ user, isAuthenticated: true })
      } catch (error) {
        // 忽略取消的请求
        if (error.message === '请求已取消') {
          console.log('[AuthStore] 请求被取消，忽略')
        } else {
          console.error('[AuthStore] 刷新用户信息失败:', error)
          // 如果刷新失败，但有缓存，保持登录状态
          if (!cachedUser) {
            tokenManager.clearAll()
            set({ user: null, isAuthenticated: false })
          }
        }
      } finally {
        initializing = false
      }
    } else {
      set({ user: null, isAuthenticated: false })
    }
  },
}))

export default useAuthStore
