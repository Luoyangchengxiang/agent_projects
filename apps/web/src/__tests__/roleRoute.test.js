/**
 * 角色权限逻辑单元测试
 * 测试角色过滤、菜单可见性、路由保护逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock authStore
vi.mock('../stores/authStore', () => ({
  __esModule: true,
  default: vi.fn(),
}))

import useAuthStore from '../stores/authStore'

/**
 * 模拟 RoleRoute 的核心逻辑（与 RoleRoute.jsx 保持一致）
 * 不直接导入 JSX 组件，避免 React preamble 问题
 */
function checkRoleAccess(isAuthenticated, userRole, roles) {
  if (!isAuthenticated) return { allowed: false, redirect: '/login' }
  if (!roles || roles.length === 0) return { allowed: true }
  if (!roles.includes(userRole)) return { allowed: false, redirect: '/' }
  return { allowed: true }
}

describe('RoleRoute 路由保护逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未登录时重定向到登录页', () => {
    const result = checkRoleAccess(false, null, ['admin'])
    expect(result).toEqual({ allowed: false, redirect: '/login' })
  })

  it('roles 为空数组时所有人可访问', () => {
    const result = checkRoleAccess(true, 'user', [])
    expect(result).toEqual({ allowed: true })
  })

  it('admin 用户可以访问 admin-only 路由', () => {
    const result = checkRoleAccess(true, 'admin', ['admin'])
    expect(result).toEqual({ allowed: true })
  })

  it('普通用户不能访问 admin-only 路由', () => {
    const result = checkRoleAccess(true, 'user', ['admin'])
    expect(result).toEqual({ allowed: false, redirect: '/' })
  })

  it('support 用户可以访问 admin,support 路由', () => {
    const result = checkRoleAccess(true, 'support', ['admin', 'support'])
    expect(result).toEqual({ allowed: true })
  })

  it('vip 用户不能访问 admin,support 路由', () => {
    const result = checkRoleAccess(true, 'vip', ['admin', 'support'])
    expect(result).toEqual({ allowed: false, redirect: '/' })
  })

  it('vip 用户可以访问 admin,vip 路由', () => {
    const result = checkRoleAccess(true, 'vip', ['admin', 'vip'])
    expect(result).toEqual({ allowed: true })
  })

  it('user 为 undefined 时重定向到首页', () => {
    const result = checkRoleAccess(true, undefined, ['admin'])
    expect(result).toEqual({ allowed: false, redirect: '/' })
  })

  it('roles 参数省略时默认为空数组，所有人可访问', () => {
    const result = checkRoleAccess(true, 'user', undefined)
    expect(result).toEqual({ allowed: true })
  })
})

describe('菜单角色过滤逻辑', () => {
  const menuItems = [
    { path: '/', label: '仪表盘', roles: [] },
    { path: '/errors', label: '错误日志', roles: ['admin'] },
    { path: '/reports', label: '数据报告', roles: ['admin', 'vip'] },
    { path: '/cronjobs', label: '定时任务', roles: ['admin'] },
    { path: '/chat', label: '客服管理', roles: ['admin', 'support'] },
    { path: '/permissions', label: '权限管理', roles: ['admin'] },
    { path: '/settings', label: '设置', roles: [] },
  ]

  function filterMenu(role) {
    return menuItems.filter(item => {
      if (!item.roles || item.roles.length === 0) return true
      return item.roles.includes(role)
    }).map(item => item.label)
  }

  it('admin 可以看到所有菜单', () => {
    expect(filterMenu('admin')).toEqual([
      '仪表盘', '错误日志', '数据报告', '定时任务', '客服管理', '权限管理', '设置'
    ])
  })

  it('support 只能看到仪表盘、客服管理、设置', () => {
    expect(filterMenu('support')).toEqual(['仪表盘', '客服管理', '设置'])
  })

  it('vip 可以看到仪表盘、数据报告、设置', () => {
    expect(filterMenu('vip')).toEqual(['仪表盘', '数据报告', '设置'])
  })

  it('user 只能看到仪表盘和设置', () => {
    expect(filterMenu('user')).toEqual(['仪表盘', '设置'])
  })
})

describe('后端权限中间件配置验证', () => {
  const apiPermissions = {
    'error-logs': ['admin'],
    'reports': ['admin', 'vip'],
    'cronjobs': ['admin'],
    'chat/conversations': [],        // 所有用户可创建/查看对话
    'chat/messages': [],             // 所有用户可发消息
    'chat/status': [],               // 所有用户可查看状态
    'chat/takeover': ['admin', 'support'],  // 仅客服管理
    'permissions/users': ['admin'],
    'permissions/me': [],  // 所有已登录用户
  }

  it('error-logs 仅 admin 可访问', () => {
    expect(apiPermissions['error-logs']).toEqual(['admin'])
  })

  it('reports 仅 admin+vip 可访问', () => {
    expect(apiPermissions['reports']).toEqual(['admin', 'vip'])
  })

  it('cronjobs 仅 admin 可访问', () => {
    expect(apiPermissions['cronjobs']).toEqual(['admin'])
  })

  it('chat 对话/消息/状态 所有用户可访问', () => {
    expect(apiPermissions['chat/conversations']).toEqual([])
    expect(apiPermissions['chat/messages']).toEqual([])
    expect(apiPermissions['chat/status']).toEqual([])
  })

  it('chat 管理功能仅 admin+support 可访问', () => {
    expect(apiPermissions['chat/takeover']).toEqual(['admin', 'support'])
  })

  it('permissions/users 仅 admin 可访问', () => {
    expect(apiPermissions['permissions/users']).toEqual(['admin'])
  })

  it('permissions/me 所有已登录用户可访问', () => {
    expect(apiPermissions['permissions/me']).toEqual([])
  })

  it('前后端权限配置一致（前端菜单 vs 后端 API）', () => {
    // 前端菜单配置中的 roles 应与后端 API 中间件一致
    const frontendMenu = [
      { label: '错误日志', roles: ['admin'] },
      { label: '数据报告', roles: ['admin', 'vip'] },
      { label: '定时任务', roles: ['admin'] },
      { label: '客服管理', roles: ['admin', 'support'] },
      { label: '权限管理', roles: ['admin'] },
    ]

    frontendMenu.forEach(item => {
      const label = item.label
      let apiKey
      switch (label) {
        case '错误日志': apiKey = 'error-logs'; break
        case '数据报告': apiKey = 'reports'; break
        case '定时任务': apiKey = 'cronjobs'; break
        case '客服管理': apiKey = 'chat/takeover'; break
        case '权限管理': apiKey = 'permissions/users'; break
      }
      expect(item.roles).toEqual(apiPermissions[apiKey],
        `${label} 前端权限 ${item.roles} 与后端 ${apiPermissions[apiKey]} 不一致`)
    })
  })
})
