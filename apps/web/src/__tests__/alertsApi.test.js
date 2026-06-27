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
import { alertsApi } from '../services/alertsApi'

describe('alertsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getList', () => {
    it('获取告警规则列表', async () => {
      const mock = { data: [{ id: 1, name: '规则1' }] }
      request.get.mockResolvedValue(mock)

      const result = await alertsApi.getList({ page: 1 })

      expect(request.get).toHaveBeenCalledWith('/alerts', { params: { page: 1 } })
      expect(result).toEqual(mock)
    })

    it('无参数时传空对象', async () => {
      request.get.mockResolvedValue({ data: [] })
      await alertsApi.getList()
      expect(request.get).toHaveBeenCalledWith('/alerts', { params: {} })
    })
  })

  describe('getDetail', () => {
    it('获取规则详情', async () => {
      const mock = { data: { id: 1, name: '规则1' } }
      request.get.mockResolvedValue(mock)

      const result = await alertsApi.getDetail(1)

      expect(request.get).toHaveBeenCalledWith('/alerts/1')
      expect(result).toEqual(mock)
    })
  })

  describe('create', () => {
    it('创建告警规则', async () => {
      const data = {
        name: '错误过多',
        error_type: 'system_error',
        threshold_count: 10,
        time_window_minutes: 60,
      }
      request.post.mockResolvedValue({ data: { id: 1, ...data } })

      await alertsApi.create(data)

      expect(request.post).toHaveBeenCalledWith('/alerts', data)
    })
  })

  describe('update', () => {
    it('更新告警规则', async () => {
      const data = { threshold_count: 20 }
      request.put.mockResolvedValue({ data: { id: 1, ...data } })

      await alertsApi.update(1, data)

      expect(request.put).toHaveBeenCalledWith('/alerts/1', data)
    })
  })

  describe('delete', () => {
    it('删除告警规则', async () => {
      request.delete.mockResolvedValue({ data: { success: true } })

      await alertsApi.delete(1)

      expect(request.delete).toHaveBeenCalledWith('/alerts/1')
    })
  })

  describe('checkAll', () => {
    it('手动检查所有规则', async () => {
      const mock = { data: { alerts: [], triggered_count: 0 } }
      request.get.mockResolvedValue(mock)

      const result = await alertsApi.checkAll()

      expect(request.get).toHaveBeenCalledWith('/alerts/check')
      expect(result).toEqual(mock)
    })
  })

  describe('checkRule', () => {
    it('检查单条规则', async () => {
      const mock = { data: { triggered: false, current_count: 3 } }
      request.post.mockResolvedValue(mock)

      const result = await alertsApi.checkRule(1)

      expect(request.post).toHaveBeenCalledWith('/alerts/1/check')
      expect(result).toEqual(mock)
    })
  })
})
