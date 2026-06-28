/**
 * Token管理器
 * 负责Token的存储、读取、清除
 *
 * 存储策略：localStorage（持久化，关闭浏览器后仍保留）
 * 安全措施：Token过期自动清除
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const REMEMBER_KEY = 'auth_remember'

// 默认记住天数（可通过环境变量配置）
const DEFAULT_REMEMBER_DAYS = parseInt(import.meta.env.VITE_REMEMBER_DAYS || '30', 10)

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

  // ========== 记住密码相关 ==========

  /**
   * 保存记住的登录信息
   * @param {string} login - 用户名或邮箱
   * @param {string} password - 密码
   * @param {number} days - 记住天数
   */
  saveRemember(login, password, days = DEFAULT_REMEMBER_DAYS) {
    try {
      const data = {
        login,
        password,
        expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
      }
      localStorage.setItem(REMEMBER_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[TokenManager] 保存记住密码失败:', e)
    }
  },

  /**
   * 获取记住的登录信息
   * @returns {{ login: string, password: string } | null}
   */
  getRemember() {
    try {
      const data = localStorage.getItem(REMEMBER_KEY)
      if (!data) return null

      const parsed = JSON.parse(data)
      // 检查是否过期
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.clearRemember()
        return null
      }

      return { login: parsed.login, password: parsed.password }
    } catch {
      return null
    }
  },

  /**
   * 清除记住的登录信息
   */
  clearRemember() {
    try {
      localStorage.removeItem(REMEMBER_KEY)
    } catch (e) {
      console.error('[TokenManager] 清除记住密码失败:', e)
    }
  },

  /**
   * 是否有记住的登录信息
   */
  hasRemember() {
    return !!this.getRemember()
  },
}
