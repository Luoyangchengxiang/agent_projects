/**
 * 认证状态管理（Zustand）
 * 全局管理用户登录状态、用户信息
 */

import create from 'zustand'
import { authService } from '../services/authService'
import { tokenManager } from '../services/tokenManager'
import useMascotStore from './mascotStore'

const useAuthStore = create((set, get) => ({
  // 状态
  user: tokenManager.getUser(),
  isAuthenticated: tokenManager.hasToken(),
  isLoading: false,
  isInitialized: false, // 新增：标记是否已初始化
  error: null,

  // 登录（支持用户名或邮箱）
  login: async (login, password, remember = false) => {
    set({ isLoading: true, error: null })
    try {
      const result = await authService.login(login, password, remember)
      console.log('[AuthStore] 登录成功:', result)
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      // 同步看板娘选择到 mascotStore
      if (result.user?.mascot_model_id) {
        useMascotStore.getState().syncFromUser(result.user.mascot_model_id)
      } else {
        // 新用户或未选择看板娘，清除 localStorage 中的旧缓存
        useMascotStore.getState().reset()
      }
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
    // 清理看板娘菜单/聊天状态（不清 localStorage，让下次登录时根据用户数据同步）
    useMascotStore.getState().closeMenu()
    useMascotStore.getState().closeChat()
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      // 注意：不要重置 isInitialized！否则会卡在"加载中..."
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
    const { isInitialized, isAuthenticated } = get()
    
    // 防止重复初始化
    if (isInitialized) {
      console.log('[AuthStore] 已初始化，跳过')
      return
    }
    
    const hasToken = tokenManager.hasToken()
    console.log('[AuthStore] 初始化, hasToken:', hasToken, 'isAuthenticated:', isAuthenticated)
    
    // 如果已经通过 login() 登录成功，跳过初始化
    if (isAuthenticated) {
      console.log('[AuthStore] 已登录，跳过初始化')
      set({ isInitialized: true })
      return
    }
    
    if (hasToken) {
      // 先从缓存获取用户信息
      const cachedUser = tokenManager.getUser()
      if (cachedUser) {
        console.log('[AuthStore] 使用缓存的用户信息:', cachedUser)
        set({ user: cachedUser, isAuthenticated: true })
      }
      
      // 然后尝试刷新用户信息
      try {
        const user = await authService.getCurrentUser()
        console.log('[AuthStore] 刷新用户信息成功:', user)
        set({ user, isAuthenticated: true })
        // 同步看板娘选择
        if (user?.mascot_model_id) {
          useMascotStore.getState().syncFromUser(user.mascot_model_id)
        } else {
          // 用户未选择看板娘，清除旧缓存
          useMascotStore.getState().reset()
        }
      } catch (error) {
        console.error('[AuthStore] 刷新用户信息失败:', error)
        // 如果刷新失败，但有缓存，保持登录状态
        if (!cachedUser) {
          tokenManager.clearAll()
          set({ user: null, isAuthenticated: false })
        }
      }
    } else {
      // 只有在确认没有 token 且未登录时才清除状态
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
    
    // 标记初始化完成
    set({ isInitialized: true })
  },
}))

export default useAuthStore
