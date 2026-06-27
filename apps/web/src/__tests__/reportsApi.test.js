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
import { reportsApi } from '../services/reportsApi'

describe('reportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getList', () => {
    it('获取报告列表', async () => {
      const mock = { data: [{ id: 1, title: '周报' }] }
      request.get.mockResolvedValue(mock)

      const result = await reportsApi.getList({ page: 1 })

      expect(request.get).toHaveBeenCalledWith('/reports', { params: { page: 1 } })
      expect(result).toEqual(mock)
    })

    it('无参数时传空对象', async () => {
      request.get.mockResolvedValue({ data: [] })
      await reportsApi.getList()
      expect(request.get).toHaveBeenCalledWith('/reports', { params: {} })
    })
  })

  describe('getDetail', () => {
    it('获取报告详情', async () => {
      const mock = { data: { id: 1, title: '周报', content: '...' } }
      request.get.mockResolvedValue(mock)

      const result = await reportsApi.getDetail(1)

      expect(request.get).toHaveBeenCalledWith('/reports/1')
      expect(result).toEqual(mock)
    })
  })

  describe('generateWeekly', () => {
    it('调用生成周报接口', async () => {
      request.post.mockResolvedValue({ data: { id: 1 } })

      await reportsApi.generateWeekly()

      expect(request.post).toHaveBeenCalledWith('/reports/generate/weekly')
    })
  })

  describe('generateMonthly', () => {
    it('调用生成月报接口', async () => {
      request.post.mockResolvedValue({ data: { id: 2 } })

      await reportsApi.generateMonthly()

      expect(request.post).toHaveBeenCalledWith('/reports/generate/monthly')
    })
  })

  describe('generateSelection', () => {
    it('调用生成选品报告接口', async () => {
      request.post.mockResolvedValue({ data: { id: 3 } })

      await reportsApi.generateSelection()

      expect(request.post).toHaveBeenCalledWith('/reports/generate/selection')
    })
  })

  describe('generateCustom', () => {
    it('带日期范围调用自定义报告', async () => {
      request.post.mockResolvedValue({ data: { id: 4 } })

      await reportsApi.generateCustom('2026-01-01', '2026-06-30')

      expect(request.post).toHaveBeenCalledWith('/reports/generate/custom', {
        start_date: '2026-01-01',
        end_date: '2026-06-30',
      })
    })
  })

  describe('download', () => {
    it('下载报告使用 blob 响应', async () => {
      const blob = new Blob(['test'])
      request.get.mockResolvedValue({ data: blob })

      await reportsApi.download(1)

      expect(request.get).toHaveBeenCalledWith('/reports/1/download', {
        responseType: 'blob',
      })
    })
  })

  describe('delete', () => {
    it('删除报告', async () => {
      request.delete.mockResolvedValue({ data: { success: true } })

      await reportsApi.delete(1)

      expect(request.delete).toHaveBeenCalledWith('/reports/1')
    })
  })
})
