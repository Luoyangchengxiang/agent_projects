/**
 * 认证服务
 * 封装所有认证相关的API调用
 */

import request from './request'
import { tokenManager } from './tokenManager'

export const authService = {
  /**
   * 登录
   * @param {string} email - 邮箱或用户名
   * @param {string} password - 密码
   * @returns {Promise<{user: object, token: string, is_local_login: boolean}>}
   */
  async login(email, password) {
    const res = await request.post('/auth/login', { email, password })
    const { user, token, is_local_login } = res.data

    // 存储Token和用户信息
    tokenManager.setToken(token)
    tokenManager.setUser(user)

    return { user, token, is_local_login }
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
    const user = res.data.user

    // 更新缓存
    tokenManager.setUser(user)

    return user
  },

  /**
   * 退出登录
   */
  async logout() {
    try {
      await request.post('/auth/logout')
    } catch {
      // 即使API调用失败，也清除本地状态
    } finally {
      tokenManager.clearAll()
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
