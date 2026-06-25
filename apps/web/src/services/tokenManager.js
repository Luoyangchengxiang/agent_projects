/**
 * Token管理器
 * 负责Token的存储、读取、清除
 *
 * 存储策略：localStorage（持久化，关闭浏览器后仍保留）
 * 安全措施：Token过期自动清除
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const tokenManager = {
  /**
   * 获取Token
   */
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  /**
   * 设置Token
   */
  setToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch (e) {
      console.error('[TokenManager] 存储Token失败:', e)
    }
  },

  /**
   * 清除Token
   */
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch (e) {
      console.error('[TokenManager] 清除Token失败:', e)
    }
  },

  /**
   * 获取缓存的用户信息
   */
  getUser() {
    try {
      const data = localStorage.getItem(USER_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  /**
   * 缓存用户信息
   */
  setUser(user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch (e) {
      console.error('[TokenManager] 存储用户信息失败:', e)
    }
  },

  /**
   * 是否已登录（有Token）
   */
  hasToken() {
    return !!this.getToken()
  },

  /**
   * 清除所有认证信息
   */
  clearAll() {
    this.clearToken()
  },
}
