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
import { metricsApi } from '../services/metricsApi'

describe('metricsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getList', () => {
    it('获取指标列表', async () => {
      const mock = { data: [{ id: 1, metric_name: 'cpu', metric_value: 45.5 }] }
      request.get.mockResolvedValue(mock)

      const result = await metricsApi.getList({ agent_id: 1, metric_name: 'cpu' })

      expect(request.get).toHaveBeenCalledWith('/metrics', {
        params: { agent_id: 1, metric_name: 'cpu' },
      })
      expect(result).toEqual(mock)
    })

    it('无参数时传空对象', async () => {
      request.get.mockResolvedValue({ data: [] })
      await metricsApi.getList()
      expect(request.get).toHaveBeenCalledWith('/metrics', { params: {} })
    })
  })

  describe('record', () => {
    it('记录单条指标', async () => {
      const data = { agent_id: 1, metric_name: 'cpu', metric_value: 55.2 }
      request.post.mockResolvedValue({ data: { id: 1, ...data } })

      await metricsApi.record(data)

      expect(request.post).toHaveBeenCalledWith('/metrics', data)
    })
  })

  describe('batchRecord', () => {
    it('批量记录指标', async () => {
      const metrics = [
        { agent_id: 1, metric_name: 'cpu', metric_value: 50 },
        { agent_id: 1, metric_name: 'memory', metric_value: 70 },
      ]
      request.post.mockResolvedValue({ data: { recorded_count: 2 } })

      await metricsApi.batchRecord(metrics)

      expect(request.post).toHaveBeenCalledWith('/metrics/batch', { metrics })
    })
  })

  describe('getMetricNames', () => {
    it('获取指标类型列表', async () => {
      const mock = { data: ['cpu', 'memory', 'response_time'] }
      request.get.mockResolvedValue(mock)

      const result = await metricsApi.getMetricNames()

      expect(request.get).toHaveBeenCalledWith('/metrics/names')
      expect(result).toEqual(mock)
    })
  })

  describe('getStats', () => {
    it('获取指定 Agent 指标统计', async () => {
      const mock = { data: { count: 100, avg: 45.5, min: 10, max: 90, latest: 55 } }
      request.get.mockResolvedValue(mock)

      const result = await metricsApi.getStats(1, { metric_name: 'cpu', minutes: 60 })

      expect(request.get).toHaveBeenCalledWith('/metrics/1/stats', {
        params: { metric_name: 'cpu', minutes: 60 },
      })
      expect(result).toEqual(mock)
    })
  })

  describe('getTrend', () => {
    it('获取指定 Agent 指标趋势', async () => {
      const mock = { data: [{ time: '2026-06-27T10:00:00', avg: 45, min: 30, max: 60, count: 10 }] }
      request.get.mockResolvedValue(mock)

      const result = await metricsApi.getTrend(1, { metric_name: 'cpu', hours: 24 })

      expect(request.get).toHaveBeenCalledWith('/metrics/1/trend', {
        params: { metric_name: 'cpu', hours: 24 },
      })
      expect(result).toEqual(mock)
    })
  })

  describe('getOverview', () => {
    it('获取 Agent 指标概览', async () => {
      const mock = { data: { cpu: { avg: 45, max: 90, count: 100 }, memory: { avg: 60, max: 85, count: 100 } } }
      request.get.mockResolvedValue(mock)

      const result = await metricsApi.getOverview(1)

      expect(request.get).toHaveBeenCalledWith('/metrics/1/overview')
      expect(result).toEqual(mock)
    })
  })

  describe('delete', () => {
    it('删除指定 Agent 的指标数据', async () => {
      request.delete.mockResolvedValue({ data: { deleted_count: 50 } })

      await metricsApi.delete(1)

      expect(request.delete).toHaveBeenCalledWith('/metrics', { data: { agent_id: 1 } })
    })

    it('删除指定日期之前的指标', async () => {
      request.delete.mockResolvedValue({ data: { deleted_count: 30 } })

      await metricsApi.delete(1, '2026-06-01')

      expect(request.delete).toHaveBeenCalledWith('/metrics', {
        data: { agent_id: 1, before_date: '2026-06-01' },
      })
    })
  })
})
