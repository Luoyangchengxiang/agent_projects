import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the request module
vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import request from '../services/request'
import { cronjobsApi } from '../services/cronjobsApi'

describe('cronjobsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getList', () => {
    it('should call GET /cronjobs with params', async () => {
      const mockData = [{ id: 1, name: 'Daily Report' }]
      request.get.mockResolvedValue({ success: true, data: mockData, pagination: { total: 1 } })

      const result = await cronjobsApi.getList({ page: 1, per_page: 10 })

      expect(request.get).toHaveBeenCalledWith('/cronjobs', { params: { page: 1, per_page: 10 } })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
    })

    it('should call GET /cronjobs without params', async () => {
      request.get.mockResolvedValue({ success: true, data: [] })

      await cronjobsApi.getList()

      expect(request.get).toHaveBeenCalledWith('/cronjobs', { params: {} })
    })
  })

  describe('getStats', () => {
    it('should call GET /cronjobs/stats', async () => {
      const mockStats = { total: 5, active: 3, paused: 1, error: 1 }
      request.get.mockResolvedValue({ success: true, data: mockStats })

      const result = await cronjobsApi.getStats()

      expect(request.get).toHaveBeenCalledWith('/cronjobs/stats')
      expect(result.data).toEqual(mockStats)
    })
  })

  describe('getDetail', () => {
    it('should call GET /cronjobs/:id', async () => {
      const mockJob = { id: 1, name: 'Test Job', schedule: '0 9 * * *' }
      request.get.mockResolvedValue({ success: true, data: mockJob })

      const result = await cronjobsApi.getDetail(1)

      expect(request.get).toHaveBeenCalledWith('/cronjobs/1')
      expect(result.data).toEqual(mockJob)
    })
  })

  describe('create', () => {
    it('should call POST /cronjobs with data', async () => {
      const jobData = { name: 'New Job', schedule: '0 9 * * *', prompt: 'Run daily' }
      const mockResponse = { success: true, data: { id: 2, ...jobData } }
      request.post.mockResolvedValue(mockResponse)

      const result = await cronjobsApi.create(jobData)

      expect(request.post).toHaveBeenCalledWith('/cronjobs', jobData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('update', () => {
    it('should call PUT /cronjobs/:id with data', async () => {
      const updateData = { name: 'Updated Job' }
      const mockResponse = { success: true, data: { id: 1, ...updateData } }
      request.put.mockResolvedValue(mockResponse)

      const result = await cronjobsApi.update(1, updateData)

      expect(request.put).toHaveBeenCalledWith('/cronjobs/1', updateData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('should call DELETE /cronjobs/:id', async () => {
      request.delete.mockResolvedValue({ success: true, message: '删除成功' })

      const result = await cronjobsApi.delete(1)

      expect(request.delete).toHaveBeenCalledWith('/cronjobs/1')
      expect(result.success).toBe(true)
    })
  })

  describe('pause', () => {
    it('should call POST /cronjobs/:id/pause', async () => {
      request.post.mockResolvedValue({ success: true, message: '已暂停' })

      const result = await cronjobsApi.pause(1)

      expect(request.post).toHaveBeenCalledWith('/cronjobs/1/pause')
      expect(result.success).toBe(true)
    })
  })

  describe('resume', () => {
    it('should call POST /cronjobs/:id/resume', async () => {
      request.post.mockResolvedValue({ success: true, message: '已恢复' })

      const result = await cronjobsApi.resume(1)

      expect(request.post).toHaveBeenCalledWith('/cronjobs/1/resume')
      expect(result.success).toBe(true)
    })
  })

  describe('run', () => {
    it('should call POST /cronjobs/:id/run', async () => {
      request.post.mockResolvedValue({ success: true, message: '任务已触发' })

      const result = await cronjobsApi.run(1)

      expect(request.post).toHaveBeenCalledWith('/cronjobs/1/run')
      expect(result.success).toBe(true)
    })
  })

  describe('getLogs', () => {
    it('should call GET /cronjobs/:id/logs with params', async () => {
      const mockLogs = [
        { id: 1, status: 'success', duration: 1500 },
        { id: 2, status: 'failed', duration: 500 },
      ]
      request.get.mockResolvedValue({ success: true, data: mockLogs })

      const result = await cronjobsApi.getLogs(1, { page: 1 })

      expect(request.get).toHaveBeenCalledWith('/cronjobs/1/logs', { params: { page: 1 } })
      expect(result.data).toEqual(mockLogs)
    })

    it('should call GET /cronjobs/:id/logs without params', async () => {
      request.get.mockResolvedValue({ success: true, data: [] })

      await cronjobsApi.getLogs(1)

      expect(request.get).toHaveBeenCalledWith('/cronjobs/1/logs', { params: {} })
    })
  })
})
