import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import request from '../services/request'
import { versionUpdateApi } from '../services/versionUpdateApi'

describe('versionUpdateApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getList', () => {
    it('获取版本列表', async () => {
      const mock = { data: [{ id: 1, version: '1.0.0' }] }
      request.get.mockResolvedValue(mock)

      const result = await versionUpdateApi.getList({ page: 1 })

      expect(request.get).toHaveBeenCalledWith('/version-updates', { params: { page: 1 } })
      expect(result).toEqual(mock)
    })

    it('无参数时传空对象', async () => {
      request.get.mockResolvedValue({ data: [] })
      await versionUpdateApi.getList()
      expect(request.get).toHaveBeenCalledWith('/version-updates', { params: {} })
    })
  })

  describe('getLatest', () => {
    it('获取最新版本', async () => {
      const mock = { data: { id: 1, version: '2.0.0', title: '新版本' } }
      request.get.mockResolvedValue(mock)

      const result = await versionUpdateApi.getLatest()

      expect(request.get).toHaveBeenCalledWith('/version-updates/latest')
      expect(result).toEqual(mock)
    })
  })

  describe('create', () => {
    it('创建版本记录', async () => {
      const data = { version: '2.0.0', title: '新版本发布', content: '更新内容' }
      request.post.mockResolvedValue({ data: { id: 1, ...data } })

      await versionUpdateApi.create(data)

      expect(request.post).toHaveBeenCalledWith('/version-updates', data)
    })
  })

  describe('update', () => {
    it('更新版本记录', async () => {
      const data = { title: '修改标题' }
      request.put.mockResolvedValue({ data: { id: 1, ...data } })

      await versionUpdateApi.update(1, data)

      expect(request.put).toHaveBeenCalledWith('/version-updates/1', data)
    })
  })

  describe('delete', () => {
    it('删除版本记录', async () => {
      request.delete.mockResolvedValue({ data: { success: true } })

      await versionUpdateApi.delete(1)

      expect(request.delete).toHaveBeenCalledWith('/version-updates/1')
    })
  })
})
