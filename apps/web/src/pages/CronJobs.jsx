import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
  Empty,
  Spin,
  Tooltip,
  Badge,
  Drawer,
  Descriptions,
  Tabs,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { cronjobsApi } from '../services/cronjobsApi'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

// Cron 表达式预设
const CRON_PRESETS = [
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 21:00', value: '0 21 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每30分钟', value: '*/30 * * * *' },
  { label: '每5分钟', value: '*/5 * * * *' },
]

function CronJobs() {
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [modalVisible, setModalVisible] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [form] = Form.useForm()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState(null)

  // 加载任务列表
  const loadJobs = async (page = 1) => {
    setLoading(true)
    try {
      const res = await cronjobsApi.getList({
        page,
        per_page: pagination.pageSize,
        search: searchQuery,
        status: filterStatus,
      })
      if (res.success) {
        setJobs(res.data)
        setPagination({
          ...pagination,
          current: page,
          total: res.pagination.total,
        })
      }
    } catch (error) {
      console.error('加载任务列表失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载统计信息
  const loadStats = async () => {
    try {
      const res = await cronjobsApi.getStats()
      if (res.success) {
        setStats(res.data)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  useEffect(() => {
    loadJobs()
    loadStats()
  }, [])

  // 搜索
  const handleSearch = () => {
    loadJobs(1)
  }

  // 创建/编辑任务
  const handleSubmit = async (values) => {
    try {
      if (editingJob) {
        await cronjobsApi.update(editingJob.id, values)
        message.success('更新成功')
      } else {
        await cronjobsApi.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingJob(null)
      form.resetFields()
      loadJobs()
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 暂停任务
  const handlePause = async (id) => {
    try {
      await cronjobsApi.pause(id)
      message.success('已暂停')
      loadJobs(pagination.current)
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 恢复任务
  const handleResume = async (id) => {
    try {
      await cronjobsApi.resume(id)
      message.success('已恢复')
      loadJobs(pagination.current)
      loadStats()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 手动执行
  const handleRun = async (id) => {
    try {
      await cronjobsApi.run(id)
      message.success('任务已触发')
      loadJobs(pagination.current)
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 删除任务
  const handleDelete = async (id) => {
    try {
      await cronjobsApi.delete(id)
      message.success('删除成功')
      loadJobs(pagination.current)
      loadStats()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 查看详情
  const handleViewDetail = async (job) => {
    setSelectedJob(job)
    setDrawerVisible(true)
    loadLogs(job.id)
  }

  // 加载执行日志
  const loadLogs = async (jobId) => {
    setLogsLoading(true)
    try {
      const res = await cronjobsApi.getLogs(jobId)
      if (res.success) {
        setLogs(res.data)
      }
    } catch (error) {
      console.error('加载日志失败:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  // 打开编辑弹窗
  const handleEdit = (job) => {
    setEditingJob(job)
    form.setFieldsValue({
      name: job.name,
      prompt: job.prompt,
      schedule: job.schedule,
      config: job.config,
    })
    setModalVisible(true)
  }

  // 表格列定义
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          active: { color: 'success', text: '运行中' },
          paused: { color: 'default', text: '已暂停' },
          error: { color: 'error', text: '异常' },
        }
        const config = statusMap[status] || { color: 'default', text: status }
        return <Badge status={config.color} text={config.text} />
      },
    },
    {
      title: '执行计划',
      dataIndex: 'schedule',
      key: 'schedule',
      width: 150,
      render: (schedule) => (
        <Tag icon={<ClockCircleOutlined />}>{schedule}</Tag>
      ),
    },
    {
      title: '执行次数',
      dataIndex: 'run_count',
      key: 'run_count',
      width: 100,
      align: 'center',
    },
    {
      title: '成功率',
      key: 'success_rate',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const rate = record.run_count > 0 
          ? ((record.run_count - record.fail_count) / record.run_count * 100).toFixed(1)
          : 0
        return (
          <Text style={{ color: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444' }}>
            {rate}%
          </Text>
        )
      },
    },
    {
      title: '上次执行',
      dataIndex: 'last_run_at',
      key: 'last_run_at',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'active' ? (
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePause(record.id)}
            >
              暂停
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleResume(record.id)}
            >
              恢复
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => handleRun(record.id)}
          >
            执行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此任务？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 日志表格列
  const logColumns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
          {status === 'success' ? '成功' : status === 'failed' ? '失败' : '超时'}
        </Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration) => duration ? `${duration}ms` : '-',
    },
    {
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '输出',
      dataIndex: 'output',
      key: 'output',
      ellipsis: true,
    },
  ]

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          定时任务
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { loadJobs(); loadStats() }}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingJob(null)
              form.resetFields()
              setModalVisible(true)
            }}
          >
            创建任务
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card>
              <Statistic title="总任务数" value={stats.total} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="运行中" value={stats.active} valueStyle={{ color: '#10b981' }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="已暂停" value={stats.paused} valueStyle={{ color: '#6b7280' }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="异常" value={stats.error} valueStyle={{ color: '#ef4444' }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="总执行次数" value={stats.total_runs} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic 
                title="成功率" 
                value={stats.success_rate} 
                suffix="%" 
                valueStyle={{ color: stats.success_rate >= 80 ? '#10b981' : '#f59e0b' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input.Search
            placeholder="搜索任务名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="筛选状态"
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="active">运行中</Option>
            <Option value="paused">已暂停</Option>
            <Option value="error">异常</Option>
          </Select>
          <Button onClick={handleSearch}>筛选</Button>
        </Space>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`,
            onChange: (page) => loadJobs(page),
          }}
          locale={{
            emptyText: <Empty description="暂无定时任务" />,
          }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingJob ? '编辑任务' : '创建任务'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingJob(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="输入任务名称" />
          </Form.Item>

          <Form.Item
            name="schedule"
            label="执行计划"
            rules={[{ required: true, message: '请选择或输入 Cron 表达式' }]}
          >
            <Select
              placeholder="选择预设或自定义"
              showSearch
              allowClear
            >
              {CRON_PRESETS.map(preset => (
                <Option key={preset.value} value={preset.value}>
                  {preset.label} ({preset.value})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="prompt"
            label="任务提示词"
          >
            <TextArea rows={4} placeholder="输入任务执行时的提示词..." />
          </Form.Item>

          <Form.Item
            label="Cron 表达式说明"
          >
            <Text type="secondary">
              格式：分 时 日 月 周（例：0 9 * * * = 每天9点）
            </Text>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingJob ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false)
                setEditingJob(null)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={
          <Space>
            <ClockCircleOutlined />
            {selectedJob?.name}
          </Space>
        }
        placement="right"
        onClose={() => {
          setDrawerVisible(false)
          setSelectedJob(null)
          setLogs([])
        }}
        open={drawerVisible}
        width={600}
      >
        {selectedJob && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="状态">
                <Badge 
                  status={selectedJob.status === 'active' ? 'success' : selectedJob.status === 'paused' ? 'default' : 'error'} 
                  text={selectedJob.status === 'active' ? '运行中' : selectedJob.status === 'paused' ? '已暂停' : '异常'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="执行计划">
                <Tag>{selectedJob.schedule}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="执行次数">{selectedJob.run_count}</Descriptions.Item>
              <Descriptions.Item label="失败次数">{selectedJob.fail_count}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedJob.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="上次执行" span={2}>
                {selectedJob.last_run_at ? dayjs(selectedJob.last_run_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              {selectedJob.prompt && (
                <Descriptions.Item label="任务提示词" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{selectedJob.prompt}</div>
                </Descriptions.Item>
              )}
              {selectedJob.last_error && (
                <Descriptions.Item label="最近错误" span={2}>
                  <Text type="danger">{selectedJob.last_error}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ marginBottom: 16 }}>
              <HistoryOutlined style={{ marginRight: 8 }} />
              执行日志
            </Title>

            <Table
              columns={logColumns}
              dataSource={logs}
              rowKey="id"
              loading={logsLoading}
              pagination={false}
              size="small"
              locale={{
                emptyText: <Empty description="暂无执行日志" />,
              }}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default CronJobs
