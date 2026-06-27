/**
 * HTTP 请求封装
 * 基于 Axios，包含拦截器、Token 注入、错误处理
 */

import axios from 'axios'
import { tokenManager } from './tokenManager'

// ==================== 配置 ====================

const config = {
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}

// 白名单路径（不需要 Token）
const WHITE_LIST = [
  '/auth/login',
  '/auth/register',
]

// ==================== 创建实例 ====================

const request = axios.create(config)

// ==================== 请求拦截器 ====================

request.interceptors.request.use(
  (config) => {
    // 白名单路径不附加Token（使用路径前缀精确匹配）
    const url = config.url || ''
    const isWhiteListed = url.startsWith('/auth/login') || url.startsWith('/auth/register')
    if (!isWhiteListed) {
      const token = tokenManager.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // 开发环境日志
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ==================== 响应拦截器 ====================

request.interceptors.response.use(
  (response) => {
    const { data } = response

    // 后端返回的业务错误
    if (data && data.success === false) {
      const error = new Error(data.message || '请求失败')
      error.code = data.error_type || 'BUSINESS_ERROR'
      // 保留后端返回的详细错误信息
      error.errors = data.errors || null
      return Promise.reject(error)
    }

    return data
  },
  (error) => {
    const { response } = error

    // 请求频率限制 (429)
    if (response && response.status === 429) {
      const message = response.data?.message || '请求过于频繁，请稍后再试'
      return Promise.reject(new Error(message))
    }

    // Token过期 → 清除认证信息并跳转登录
    // 注意：登录接口返回的 401 不应跳转，只显示后端错误信息
    if (response && response.status === 401) {
      const data = response.data
      const isLoginRequest = error.config?.url?.includes('/auth/login')

      if (!isLoginRequest) {
        // 非登录请求的 401，清除认证并跳转
        tokenManager.clearAll()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      // 返回后端真实错误信息
      const message = data?.message || '认证失败'
      const err = new Error(message)
      err.code = data?.error_type || 'AUTH_ERROR'
      return Promise.reject(err)
    }

    // 其他错误（包括 422 验证错误）
    const data = response?.data
    const err = new Error(data?.message || error.message || '请求失败')
    err.code = data?.error_type || 'BUSINESS_ERROR'
    // 保留后端返回的详细错误信息
    err.errors = data?.errors || null
    return Promise.reject(err)
  }
)

export default request
