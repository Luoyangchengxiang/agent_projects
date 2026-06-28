/**
 * 认证服务
 * 封装所有认证相关的API调用
 */

import request from './request'
import { tokenManager } from './tokenManager'

export const authService = {
  /**
   * 登录（支持用户名或邮箱）
   * @param {string} login - 用户名或邮箱
   * @param {string} password - 密码或 remember_token
   * @param {boolean} remember - 是否记住登录
   * @returns {Promise<{user: object, token: string, is_local_login: boolean}>}
   */
  async login(login, password, remember = false) {
    const res = await request.post('/auth/login', { login, password, remember })
    // 后端返回格式: { success: true, data: { user, token, remember_token, is_local_login } }
    const { user, token, remember_token, is_local_login } = res.data

    // 存储Token和用户信息
    tokenManager.setToken(token)
    tokenManager.setUser(user)

    // 处理 remember_token
    if (remember_token) {
      // 后端返回了 remember_token，保存（按用户名）
      tokenManager.saveRemember(login, remember_token)
    } else if (!remember) {
      // 用户没有勾选"记住30天"，清除该用户的 remember_token
      tokenManager.clearRemember(login)
    }

    // 更新最后登录用户
    tokenManager.updateLastLogin(login)

    return { user, token, remember_token, is_local_login }
  },

  /**
   * 注册
   * @param {object} params - { name, email, password, password_confirmation }
   * @returns {Promise<{user: object, token: string}>}
   */
  async register(params) {
    const res = await request.post('/auth/register', {
      ...params,
      password_confirmation: params.password,
    })
    const { user, token } = res.data

    // 注册成功自动登录
    tokenManager.setToken(token)
    tokenManager.setUser(user)

    return { user, token }
  },

  /**
   * 获取当前用户信息
   * @returns {Promise<object>}
   */
  async getCurrentUser() {
    const res = await request.get('/auth/me')
    // 后端返回格式: { success: true, data: { user } }
    const user = res.data.user

    // 更新缓存
    tokenManager.setUser(user)

    return user
  },

  /**
   * 退出登录（保留 remember_token）
   */
  async logout() {
    const currentUser = tokenManager.getUser()
    try {
      await request.post('/auth/logout')
    } catch {
      // 即使API调用失败，也清除本地状态
    } finally {
      // 只清除认证信息，保留 remember_token
      tokenManager.clearAuth()
      // 注意：lastLogin 已经在 login 时更新了，这里不需要再更新
    }
  },

  /**
   * 修改密码
   * @param {object} params - { current_password, password, password_confirmation }
   */
  async updatePassword(params) {
    const res = await request.put('/auth/password', {
      ...params,
      password_confirmation: params.password,
    })
    return res
  },

  /**
   * 修改昵称
   * @param {string} nickname - 新昵称
   */
  async updateNickname(nickname) {
    const res = await request.put('/auth/nickname', { nickname })
    return res
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    return tokenManager.hasToken()
  },

  /**
   * 获取缓存的用户信息
   */
  getCachedUser() {
    return tokenManager.getUser()
  },
}
