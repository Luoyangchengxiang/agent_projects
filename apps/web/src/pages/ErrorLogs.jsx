import { useState, useEffect } from 'react'
import { 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select, 
  Input, 
  message, 
  Modal,
  Tooltip,
  Spin
} from 'antd'
import { 
  BugOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import ErrorStats from '../components/ErrorStats'
import request from '../services/request'

// 错误类型中文映射
const errorTypeLabels = {
  system_error: '系统错误',
  database_error: '数据库错误',
  cache_error: '缓存错误',
  queue_error: '队列错误',
  api_error: 'API错误',
  auth_error: '认证错误',
  validation_error: '验证错误',
  not_found: '未找到',
  method_not_allowed: '方法不允许',
  rate_limit: '请求限流',
  agent_error: 'Agent错误',
  execution_error: '执行错误',
  task_error: '任务错误',
  external_service_error: '外部服务错误',
  network_error: '网络错误',
  timeout_error: '超时错误',
  unknown: '未知错误'
}

// 严重程度配置
const severityConfig = {
  critical: { color: 'error', label: '严重' },
  high: { color: 'warning', label: '高级' },
  medium: { color: 'processing', label: '中级' },
  low: { color: 'default', label: '低级' },
  info: { color: 'success', label: '信息' }
}

function ErrorLogs() {
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState(null)
  const [severityFilter, setSeverityFilter] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentError, setCurrentError] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 从API获取错误日志
  const fetchErrors = async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const params = {
        page,
        per_page: pageSize
      }
      if (typeFilter) params.error_type = typeFilter
      if (severityFilter) params.severity = severityFilter
      if (searchText) params.search = searchText

      const res = await request.get('/error-logs', { params })
      if (res.success) {
        setErrors(res.data.data || [])
        setPagination({
          current: res.data.current_page,
          pageSize: res.data.per_page,
          total: res.data.total
        })
      }
    } catch (error) {
      console.error('获取错误日志失败:', error)
      message.error('获取错误日志失败')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和筛选变化时重新获取
  useEffect(() => {
    fetchErrors(1, pagination.pageSize)
  }, [typeFilter, severityFilter])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchErrors(1, pagination.pageSize)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchText])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '错误类型',
      dataIndex: 'error_type',
      key: 'error_type',
      render: (type) => (
        <Tag color="red">{errorTypeLabels[type] || type}</Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const config = severityConfig[severity]
        return <Tag color={config?.color}>{config?.label}</Tag>
      }
    },
    {
      title: '错误消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-primary">{text}</span>
        </Tooltip>
      )
    },
    {
      title: '请求路径',
      dataIndex: 'url',
      key: 'url',
      render: (url, record) => (
        <span className="text-muted font-mono text-sm">
          {record.method} {url}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'is_resolved',
      key: 'is_resolved',
      render: (resolved) => (
        <Tag color={resolved ? 'success' : 'error'}>
          {resolved ? '已解决' : '未解决'}
        </Tag>
      )
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => <span className="text-muted">{text}</span>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            className="text-primary"
            onClick={() => handleViewDetail(record)}
          />
          {!record.is_resolved && (
            <Button 
              type="text" 
              icon={<CheckCircleOutlined />} 
              className="text-success"
              onClick={() => handleResolve(record.id)}
            />
          )}
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            className="text-error"
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ]

  const handleViewDetail = (error) => {
    setCurrentError(error)
    setDetailModalVisible(true)
  }

  const handleResolve = async (id) => {
    try {
      const res = await request.put(`/error-logs/${id}/resolve`)
      if (res.success) {
        message.success('已标记为已解决')
        fetchErrors(pagination.current, pagination.pageSize)
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await request.delete(`/error-logs/${id}`)
      if (res.success) {
        message.success('已删除')
        fetchErrors(pagination.current, pagination.pageSize)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return
    try {
      const res = await request.post('/error-logs/batch-destroy', {
        ids: selectedRowKeys
      })
      if (res.success) {
        message.success('批量删除成功')
        setSelectedRowKeys([])
        fetchErrors(pagination.current, pagination.pageSize)
      }
    } catch (error) {
      message.error('批量删除失败')
    }
  }

  const handleTableChange = (pag) => {
    fetchErrors(pag.current, pag.pageSize)
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">错误日志</h1>
          <p className="text-secondary mt-1">监控和排查系统错误</p>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => fetchErrors(pagination.current, pagination.pageSize)}
          >
            刷新
          </Button>
          {selectedRowKeys.length > 0 && (
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          )}
        </Space>
      </div>

      {/* 统计卡片 */}
      <ErrorStats />

      {/* 筛选栏 */}
      <div className="card mb-6">
        <div className="card-body">
          <Space wrap>
            <Input
              placeholder="搜索错误消息..."
              prefix={<SearchOutlined className="text-muted" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64"
              allowClear
            />
            <Select
              placeholder="错误类型"
              allowClear
              style={{ width: 150 }}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={Object.entries(errorTypeLabels).map(([value, label]) => ({
                value,
                label
              }))}
            />
            <Select
              placeholder="严重程度"
              allowClear
              style={{ width: 120 }}
              value={severityFilter}
              onChange={(value) => setSeverityFilter(value)}
              options={Object.entries(severityConfig).map(([value, config]) => ({
                value,
                label: config.label
              }))}
            />
          </Space>
        </div>
      </div>

      {/* 表格 */}
      <div className="card">
        <Table
          columns={columns}
          dataSource={errors}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          onChange={handleTableChange}
        />
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="错误详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {currentError && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted text-sm">错误类型</label>
                <p className="text-primary">{errorTypeLabels[currentError.error_type]}</p>
              </div>
              <div>
                <label className="text-muted text-sm">严重程度</label>
                <p>
                  <Tag color={severityConfig[currentError.severity]?.color}>
                    {severityConfig[currentError.severity]?.label}
                  </Tag>
                </p>
              </div>
              <div>
                <label className="text-muted text-sm">请求方法</label>
                <p className="text-primary font-mono">{currentError.method || '-'}</p>
              </div>
              <div>
                <label className="text-muted text-sm">请求路径</label>
                <p className="text-primary font-mono">{currentError.url || '-'}</p>
              </div>
              <div>
                <label className="text-muted text-sm">IP地址</label>
                <p className="text-primary">{currentError.ip || '-'}</p>
              </div>
              <div>
                <label className="text-muted text-sm">发生时间</label>
                <p className="text-primary">{currentError.created_at}</p>
              </div>
            </div>
            <div>
              <label className="text-muted text-sm">错误消息</label>
              <p className="text-error bg-error/10 p-3 rounded mt-1">{currentError.message}</p>
            </div>
            {currentError.stack_trace && (
              <div>
                <label className="text-muted text-sm">堆栈跟踪</label>
                <pre className="text-xs text-muted bg-surface p-3 rounded mt-1 overflow-auto max-h-48">
                  {currentError.stack_trace}
                </pre>
              </div>
            )}
            {currentError.resolution_notes && (
              <div>
                <label className="text-muted text-sm">解决方案</label>
                <p className="text-success bg-success/10 p-3 rounded mt-1">{currentError.resolution_notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ErrorLogs
