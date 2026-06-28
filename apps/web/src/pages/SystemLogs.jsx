import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Modal,
  Descriptions,
} from 'antd'
import {
  ReloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  WarningOutlined,
  ErrorOutlined,
  InfoCircleOutlined,
  BugOutlined,
  CleanOutlined,
} from '@ant-design/icons'

const { Option } = Select
const { RangePicker } = DatePicker

function SystemLogs() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentLog, setCurrentLog] = useState(null)
  const [cleanupVisible, setCleanupVisible] = useState(false)
  const [cleanupDays, setCleanupDays] = useState(30)

  // 筛选条件
  const [filters, setFilters] = useState({
    level: undefined,
    category: undefined,
    search: undefined,
  })

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.level) params.append('level', filters.level)
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`/api/system-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setLogs(data.data.data || [])
      }
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/system-logs/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    loadLogs()
  }

  const handleReset = () => {
    setFilters({
      level: undefined,
      category: undefined,
      search: undefined,
    })
    setTimeout(loadLogs, 100)
  }

  const handleViewDetail = (record) => {
    setCurrentLog(record)
    setDetailVisible(true)
  }

  const handleCleanup = async () => {
    try {
      const res = await fetch('/api/system-logs/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ days: cleanupDays }),
      })
      const data = await res.json()
      if (data.success) {
        message.success(data.message)
        setCleanupVisible(false)
        loadLogs()
        loadStats()
      }
    } catch (error) {
      message.error('清理失败')
    }
  }

  const levelColors = {
    debug: 'default',
    info: 'blue',
    warning: 'orange',
    error: 'red',
    critical: 'magenta',
  }

  const levelLabels = {
    debug: '调试',
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重',
  }

  const categoryLabels = {
    auth: '认证',
    system: '系统',
    agent: '智能体',
    api: 'API',
    alert: '告警',
  }

  const columns = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => (
        <Tag color={levelColors[level] || 'default'}>
          {levelLabels[level] || level}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category) => categoryLabels[category] || category,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 150,
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
      render: (name) => name || '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip) => ip || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Tooltip title="查看详情">
          <Button type="link" icon={<FileTextOutlined />} onClick={() => handleViewDetail(record)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">系统日志</h1>
        <p className="text-secondary mt-1">查看系统运行日志、用户操作记录</p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="总日志数"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最近24小时"
                value={stats.last_24h}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最近1小时错误"
                value={stats.last_hour_errors}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ErrorOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="错误数"
                value={stats.by_level?.error || 0}
                valueStyle={{ color: '#cf1322' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选和操作 */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Select
            placeholder="日志级别"
            allowClear
            style={{ width: 120 }}
            value={filters.level}
            onChange={(v) => handleFilterChange('level', v)}
          >
            <Option value="debug">调试</Option>
            <Option value="info">信息</Option>
            <Option value="warning">警告</Option>
            <Option value="error">错误</Option>
            <Option value="critical">严重</Option>
          </Select>

          <Select
            placeholder="日志分类"
            allowClear
            style={{ width: 120 }}
            value={filters.category}
            onChange={(v) => handleFilterChange('category', v)}
          >
            <Option value="auth">认证</Option>
            <Option value="system">系统</Option>
            <Option value="agent">智能体</Option>
            <Option value="api">API</Option>
            <Option value="alert">告警</Option>
          </Select>

          <Input
            placeholder="搜索消息内容"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onPressEnter={handleSearch}
          />

          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>

          <Button onClick={handleReset}>重置</Button>

          <div className="flex-1" />

          <Popconfirm
            title={`确定清理 ${cleanupDays} 天前的日志？`}
            onConfirm={handleCleanup}
          >
            <Button icon={<CleanOutlined />} danger>
              清理旧日志
            </Button>
          </Popconfirm>

          <Button icon={<ReloadOutlined />} onClick={loadLogs}>
            刷新
          </Button>
        </div>
      </Card>

      {/* 日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* 日志详情弹窗 */}
      <Modal
        title="日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentLog && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID">{currentLog.id}</Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={levelColors[currentLog.level]}>
                {levelLabels[currentLog.level] || currentLog.level}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="分类">
              {categoryLabels[currentLog.category] || currentLog.category}
            </Descriptions.Item>
            <Descriptions.Item label="操作">{currentLog.action}</Descriptions.Item>
            <Descriptions.Item label="消息" span={2}>
              {currentLog.message}
            </Descriptions.Item>
            <Descriptions.Item label="用户">{currentLog.user_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{currentLog.ip_address || '-'}</Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              {currentLog.user_agent || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="上下文" span={2}>
              <pre className="bg-surface p-2 rounded text-xs overflow-auto max-h-40">
                {currentLog.context ? JSON.stringify(currentLog.context, null, 2) : '-'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{currentLog.created_at}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{currentLog.updated_at}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default SystemLogs
