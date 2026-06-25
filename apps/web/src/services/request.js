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
    // 白名单路径不附加Token
    const isWhiteListed = WHITE_LIST.some((path) => config.url?.includes(path))
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
      error.errors = data.errors || {}
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

    // Token过期 → 清除认证信息
    if (response && response.status === 401) {
      tokenManager.clearAll()
      // 不自动跳转，让组件处理
      return Promise.reject(new Error('未授权，请先登录'))
    }

    // 其他错误
    const message = response?.data?.message || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

export default request
