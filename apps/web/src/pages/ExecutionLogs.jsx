import { useState, useEffect } from 'react'
import { Table, Tag, Select, DatePicker, Space, message } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { executionLogApi } from '@agent-monitor/api'

function ExecutionLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    loadLogs()
  }, [pagination.current, pagination.pageSize, statusFilter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await executionLogApi.getList({
        page: pagination.current,
        per_page: pagination.pageSize,
        status: statusFilter || undefined
      })
      
      if (response.success) {
        setLogs(response.data.data)
        setPagination({
          ...pagination,
          total: response.data.total
        })
      }
    } catch (error) {
      console.error('加载日志失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Agent',
      dataIndex: ['agent', 'name'],
      key: 'agent_name',
      render: (text) => <span className="text-primary font-medium">{text}</span>
    },
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      render: (text) => <span className="text-muted font-mono text-sm">{text}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          success: 'success',
          failed: 'error',
          running: 'processing',
          pending: 'warning'
        }
        const textMap = {
          success: '成功',
          failed: '失败',
          running: '运行中',
          pending: '等待中'
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => {
        if (!duration) return <span className="text-muted">-</span>
        if (duration < 1000) return <span>{duration}ms</span>
        return <span>{(duration / 1000).toFixed(1)}s</span>
      }
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error) => {
        if (!error) return <span className="text-muted">-</span>
        return <span className="text-error text-sm">{error}</span>
      }
    },
    {
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => <span className="text-muted">{text}</span>
    }
  ]

  const handleTableChange = (pag) => {
    setPagination(pag)
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">执行日志</h1>
        <p className="text-secondary mt-1">查看所有Agent的执行记录</p>
      </div>

      {/* 筛选栏 */}
      <div className="card mb-6">
        <div className="card-body">
          <Space>
            <Select
              placeholder="按状态筛选"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => {
                setStatusFilter(value)
                setPagination({ ...pagination, current: 1 })
              }}
              options={[
                { value: 'success', label: '成功' },
                { value: 'failed', label: '失败' },
                { value: 'running', label: '运行中' },
                { value: 'pending', label: '等待中' }
              ]}
            />
          </Space>
        </div>
      </div>

      {/* 表格 */}
      <div className="card">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </div>
    </div>
  )
}

export default ExecutionLogs
