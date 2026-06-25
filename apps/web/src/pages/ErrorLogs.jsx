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
  Tooltip 
} from 'antd'
import { 
  BugOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined 
} from '@ant-design/icons'
import ErrorStats from '../components/ErrorStats'

// 模拟数据
const mockErrors = [
  {
    id: 1,
    error_type: 'database_error',
    message: 'Connection refused: SQLSTATE[HY000] [2002] Connection refused',
    severity: 'critical',
    url: '/api/agents',
    method: 'GET',
    ip: '127.0.0.1',
    is_resolved: false,
    created_at: '2026-06-24 10:30:00'
  },
  {
    id: 2,
    error_type: 'validation_error',
    message: 'The name field is required.',
    severity: 'low',
    url: '/api/agents',
    method: 'POST',
    ip: '192.168.1.100',
    is_resolved: true,
    created_at: '2026-06-24 09:15:00'
  },
  {
    id: 3,
    error_type: 'not_found',
    message: 'No query results for model [App\Models\Agent] 999',
    severity: 'low',
    url: '/api/agents/999',
    method: 'GET',
    ip: '192.168.1.101',
    is_resolved: false,
    created_at: '2026-06-24 08:45:00'
  },
  {
    id: 4,
    error_type: 'agent_error',
    message: 'Agent execution timeout after 30 seconds',
    severity: 'medium',
    url: '/api/execution-logs',
    method: 'POST',
    ip: '127.0.0.1',
    is_resolved: false,
    created_at: '2026-06-23 22:30:00'
  },
  {
    id: 5,
    error_type: 'system_error',
    message: 'Allowed memory size of 134217728 bytes exhausted',
    severity: 'critical',
    url: '/api/dashboard/charts',
    method: 'GET',
    ip: '127.0.0.1',
    is_resolved: true,
    created_at: '2026-06-23 18:20:00'
  }
]

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
  const [errors, setErrors] = useState(mockErrors)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState(null)
  const [severityFilter, setSeverityFilter] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentError, setCurrentError] = useState(null)

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

  const handleResolve = (id) => {
    setErrors(errors.map(e => 
      e.id === id ? { ...e, is_resolved: true } : e
    ))
    message.success('已标记为已解决')
  }

  const handleDelete = (id) => {
    setErrors(errors.filter(e => e.id !== id))
    message.success('已删除')
  }

  const handleBatchDelete = () => {
    setErrors(errors.filter(e => !selectedRowKeys.includes(e.id)))
    setSelectedRowKeys([])
    message.success('批量删除成功')
  }

  const filteredErrors = errors.filter(error => {
    if (typeFilter && error.error_type !== typeFilter) return false
    if (severityFilter && error.severity !== severityFilter) return false
    if (searchText && !error.message.includes(searchText)) return false
    return true
  })

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">错误日志</h1>
          <p className="text-secondary mt-1">监控和排查系统错误</p>
        </div>
        {selectedRowKeys.length > 0 && (
          <Button 
            danger 
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
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
          dataSource={filteredErrors}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
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
                <p className="text-primary font-mono">{currentError.method}</p>
              </div>
              <div>
                <label className="text-muted text-sm">请求路径</label>
                <p className="text-primary font-mono">{currentError.url}</p>
              </div>
              <div>
                <label className="text-muted text-sm">IP地址</label>
                <p className="text-primary">{currentError.ip}</p>
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
            <div>
              <label className="text-muted text-sm">堆栈跟踪</label>
              <pre className="text-xs text-muted bg-surface p-3 rounded mt-1 overflow-auto max-h-48">
                {`#0 /var/www/app/Controllers/Api/AgentController.php(45): App\\Models\\Agent::find(999)
#1 /var/www/app/Exceptions/Handler.php(78): App\\Exceptions\\Handler->logErrorToDatabase()
#2 /var/www/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(234): App\\Exceptions\\Handler->report()
...`}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ErrorLogs
