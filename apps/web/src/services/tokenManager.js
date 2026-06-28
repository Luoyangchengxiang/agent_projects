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
const TOKEN_EXPIRES_KEY = 'auth_token_expires'

// 默认记住天数（可通过环境变量配置）
const DEFAULT_REMEMBER_DAYS = parseInt(import.meta.env.VITE_REMEMBER_DAYS || '30', 10)

export const tokenManager = {
  /**
   * 获取Token
   */
  getToken() {
    try {
      // 检查 token 是否过期
      const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY)
      if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
        this.clearAuth()
        return null
      }
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  /**
   * 设置Token
   * @param {string} token - JWT token
   * @param {string|null} expiresAt - ISO 时间字符串，token 过期时间
   */
  setToken(token, expiresAt = null) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
      if (expiresAt) {
        localStorage.setItem(TOKEN_EXPIRES_KEY, new Date(expiresAt).getTime().toString())
      } else {
        localStorage.removeItem(TOKEN_EXPIRES_KEY)
      }
    } catch (e) {
      console.error('[TokenManager] 存储Token失败:', e)
    }
  },

  /**
   * 清除认证信息（保留 remember_token）
   */
  clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_EXPIRES_KEY)
    } catch (e) {
      console.error('[TokenManager] 清除Token失败:', e)
    }
  },

  /**
   * 清除所有信息（包括 remember_token）
   */
  clearAll() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_EXPIRES_KEY)
      localStorage.removeItem(REMEMBER_KEY)
    } catch (e) {
      console.error('[TokenManager] 清除所有信息失败:', e)
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

  // ========== 记住密码相关 ==========

  /**
   * 获取完整的 remember 数据结构
   * @returns {{ users: Object, lastLogin: string|null }}
   */
  _getRememberData() {
    try {
      const data = localStorage.getItem(REMEMBER_KEY)
      if (!data) return { users: {}, lastLogin: null }
      
      const parsed = JSON.parse(data)
      // 兼容旧版本数据结构
      if (parsed.rememberToken) {
        // 旧版本数据，迁移到新结构
        return {
          users: { [parsed.login]: { rememberToken: parsed.rememberToken, expiresAt: parsed.expiresAt } },
          lastLogin: parsed.login
        }
      }
      
      return {
        users: parsed.users || {},
        lastLogin: parsed.lastLogin || null
      }
    } catch {
      return { users: {}, lastLogin: null }
    }
  },

  /**
   * 保存完整的 remember 数据
   * @param {Object} data - { users: Object, lastLogin: string|null }
   */
  _saveRememberData(data) {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('[TokenManager] 保存remember数据失败:', e)
    }
  },

  /**
   * 保存记住的登录信息（按用户名存储）
   * @param {string} login - 用户名或邮箱
   * @param {string} rememberToken - 后端返回的 remember_token
   * @param {number} days - 记住天数
   */
  saveRemember(login, rememberToken, days = DEFAULT_REMEMBER_DAYS) {
    try {
      const data = this._getRememberData()
      data.users[login] = {
        rememberToken,
        expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
      }
      data.lastLogin = login // 更新最后登录用户
      this._saveRememberData(data)
    } catch (e) {
      console.error('[TokenManager] 保存记住密码失败:', e)
    }
  },

  /**
   * 获取指定用户的记住信息
   * @param {string} login - 用户名或邮箱
   * @returns {{ rememberToken: string } | null}
   */
  getRemember(login) {
    try {
      const data = this._getRememberData()
      const userRemember = data.users[login]
      
      if (!userRemember) return null

      // 检查是否过期
      if (userRemember.expiresAt && Date.now() > userRemember.expiresAt) {
        this.clearRemember(login)
        return null
      }

      // 确保 rememberToken 存在且是字符串
      if (!userRemember.rememberToken) {
        this.clearRemember(login)
        return null
      }

      return { rememberToken: userRemember.rememberToken }
    } catch {
      return null
    }
  },

  /**
   * 清除指定用户的记住信息
   * @param {string} login - 用户名或邮箱
   */
  clearRemember(login) {
    try {
      const data = this._getRememberData()
      delete data.users[login]
      // 如果清除的是 lastLogin，更新为其他用户或 null
      if (data.lastLogin === login) {
        const remainingUsers = Object.keys(data.users)
        data.lastLogin = remainingUsers.length > 0 ? remainingUsers[0] : null
      }
      this._saveRememberData(data)
    } catch (e) {
      console.error('[TokenManager] 清除记住密码失败:', e)
    }
  },

  /**
   * 检查指定用户是否有记住信息
   * @param {string} login - 用户名或邮箱
   * @returns {boolean}
   */
  hasRemember(login) {
    return !!this.getRemember(login)
  },

  /**
   * 获取最后一次登录的用户信息（用于自动填充）
   * @returns {{ login: string, rememberToken: string } | null}
   */
  getLastRemembered() {
    try {
      const data = this._getRememberData()
      if (!data.lastLogin) return null
      
      const userRemember = this.getRemember(data.lastLogin)
      if (!userRemember) return null
      
      return {
        login: data.lastLogin,
        rememberToken: userRemember.rememberToken
      }
    } catch {
      return null
    }
  },

  /**
   * 更新最后登录用户（退出登录时调用）
   * @param {string} login - 用户名
   */
  updateLastLogin(login) {
    try {
      const data = this._getRememberData()
      data.lastLogin = login
      this._saveRememberData(data)
    } catch (e) {
      console.error('[TokenManager] 更新最后登录用户失败:', e)
    }
  },

  /**
   * 获取所有记住的用户列表
   * @returns {string[]} - 用户名列表
   */
  getAllRememberedUsers() {
    try {
      const data = this._getRememberData()
      return Object.keys(data.users).filter(login => {
        const user = data.users[login]
        return user && user.rememberToken && (!user.expiresAt || user.expiresAt > Date.now())
      })
    } catch {
      return []
    }
  },
}
