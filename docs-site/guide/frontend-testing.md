# 前端测试编写

## 测试框架

- **Vitest**: 测试运行器
- **@testing-library/react**: React 组件测试

## 测试文件结构

```
src/__tests__/
├── authStore.test.js       # 状态管理
├── chatStore.test.js
├── mascotStore.test.js
├── request.test.js         # API 请求
├── tokenManager.test.js    # Token管理（含多用户独立存储）
├── graphApi.test.js        # API 服务
├── cronjobsApi.test.js
├── reportsApi.test.js
├── versionUpdateApi.test.js
├── alertsApi.test.js
├── metricsApi.test.js
├── authService.test.js     # 认证服务（含记住密码）
├── chatService.test.js
├── escapeHtml.test.js      # 工具函数
├── graphConstants.test.js  # 常量
├── roleRoute.test.js       # 路由权限
└── setup.js                # 测试配置
```

## 编写 API 服务测试

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock request 模块
vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import request from '../services/request'
import { alertsApi } from '../services/alertsApi'

describe('alertsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('获取列表', async () => {
    const mock = { data: [{ id: 1 }] }
    request.get.mockResolvedValue(mock)

    const result = await alertsApi.getList({ page: 1 })

    expect(request.get).toHaveBeenCalledWith('/alerts', { params: { page: 1 } })
    expect(result).toEqual(mock)
  })
})
```

## 编写工具函数测试

```javascript
import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../utils/htmlUtils'

describe('escapeHtml', () => {
  it('转义 HTML 特殊字符', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('null 返回空字符串', () => {
    expect(escapeHtml(null)).toBe('')
  })
})
```

## 编写记住密码功能测试

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tokenManager } from '../services/tokenManager'

describe('tokenManager 记住密码', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('多用户独立存储 remember_token', () => {
    tokenManager.saveRemember('admin', 'token-admin')
    tokenManager.saveRemember('test', 'token-test')

    expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
    expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })
  })

  it('清除一个用户不影响其他用户', () => {
    tokenManager.saveRemember('admin', 'token-admin')
    tokenManager.saveRemember('test', 'token-test')

    tokenManager.clearRemember('admin')

    expect(tokenManager.getRemember('admin')).toBeNull()
    expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })
  })

  it('remember_token 过期后返回 null', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    tokenManager.saveRemember('admin', 'token-admin', 1) // 1天后过期

    // 2天后
    vi.setSystemTime(new Date('2024-01-03T12:00:00Z'))
    expect(tokenManager.getRemember('admin')).toBeNull()
  })

  it('退出登录保留 remember_token', () => {
    tokenManager.saveRemember('admin', 'token-admin')
    tokenManager.saveRemember('test', 'token-test')

    tokenManager.clearAuth() // 只清除认证信息

    expect(tokenManager.getRemember('admin')).toEqual({ rememberToken: 'token-admin' })
    expect(tokenManager.getRemember('test')).toEqual({ rememberToken: 'token-test' })
  })
})
```

## 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 运行指定文件
pnpm test -- escapeHtml.test.js
```

## 测试覆盖率

```bash
pnpm test -- --coverage
```
