import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Tag,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Popconfirm,
  Tooltip,
  Badge,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  BellOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { dashboardApi } from '@agent-monitor/api'

const { Option } = Select
const { TextArea } = Input

function SystemAlerts() {
  const [rules, setRules] = useState([])
  const [histories, setHistories] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [activeTab, setActiveTab] = useState('rules')
  const [form] = Form.useForm()

  useEffect(() => {
    loadRules()
    loadStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'histories') {
      loadHistories()
    }
  }, [activeTab])

  const loadRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system-alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setRules(data.data.data || [])
      }
    } catch (error) {
      console.error('加载告警规则失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system-alerts/histories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setHistories(data.data.data || [])
      }
    } catch (error) {
      console.error('加载告警历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/system-alerts/stats', {
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

  const handleAdd = () => {
    setEditingRule(null)
    form.resetFields()
    form.setFieldsValue({
      severity: 'warning',
      check_interval_minutes: 5,
      is_enabled: true,
      notify_method: 'webhook',
      cooldown_minutes: 30,
    })
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRule(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/system-alerts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        message.success('删除成功')
        loadRules()
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const url = editingRule
        ? `/api/system-alerts/${editingRule.id}`
        : '/api/system-alerts'
      const method = editingRule ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (data.success) {
        message.success(editingRule ? '更新成功' : '创建成功')
        setModalVisible(false)
        loadRules()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCheck = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system-alerts/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        const triggered = data.data.filter(r => r.triggered)
        if (triggered.length > 0) {
          message.warning(`检测到 ${triggered.length} 个告警触发`)
        } else {
          message.success('未检测到告警')
        }
        loadHistories()
        loadStats()
      }
    } catch (error) {
      message.error('检测失败')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id, note) => {
    try {
      const res = await fetch(`/api/system-alerts/histories/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ note }),
      })
      const data = await res.json()
      if (data.success) {
        message.success('已处理')
        loadHistories()
        loadStats()
      }
    } catch (error) {
      message.error('处理失败')
    }
  }

  const ruleColumns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (type) => {
        const typeMap = {
          cpu: { color: 'blue', text: 'CPU' },
          memory: { color: 'green', text: '内存' },
          disk: { color: 'orange', text: '磁盘' },
        }
        const config = typeMap[type] || { color: 'default', text: type }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (val) => `${val}%`,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const severityMap = {
          info: { color: 'blue', text: '信息' },
          warning: { color: 'orange', text: '警告' },
          critical: { color: 'red', text: '严重' },
        }
        const config = severityMap[severity] || { color: 'default', text: severity }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      render: (enabled) => (
        <Badge status={enabled ? 'success' : 'default'} text={enabled ? '启用' : '禁用'} />
      ),
    },
    {
      title: '触发次数',
      dataIndex: 'trigger_count',
      key: 'trigger_count',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const historyColumns = [
    {
      title: '告警标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (type) => {
        const typeMap = {
          cpu: { color: 'blue', text: 'CPU' },
          memory: { color: 'green', text: '内存' },
          disk: { color: 'orange', text: '磁盘' },
        }
        const config = typeMap[type] || { color: 'default', text: type }
        return config ? <Tag color={config.color}>{config.text}</Tag> : '-'
      },
    },
    {
      title: '当前值',
      dataIndex: 'current_value',
      key: 'current_value',
      render: (val) => val ? `${val}%` : '-',
    },
    {
      title: '阈值',
      dataIndex: 'threshold_value',
      key: 'threshold_value',
      render: (val) => val ? `${val}%` : '-',
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const severityMap = {
          info: { color: 'blue', text: '信息' },
          warning: { color: 'orange', text: '警告' },
          critical: { color: 'red', text: '严重' },
        }
        const config = severityMap[severity] || { color: 'default', text: severity }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '通知状态',
      key: 'notify',
      render: (_, record) => (
        <Badge
          status={record.notify_success ? 'success' : 'error'}
          text={record.notify_success ? '成功' : '失败'}
        />
      ),
    },
    {
      title: '处理状态',
      key: 'resolved',
      render: (_, record) => (
        record.resolved_at ? (
          <Tag color="success">已处理</Tag>
        ) : (
          <Popconfirm
            title="确定标记为已处理？"
            onConfirm={() => handleResolve(record.id)}
          >
            <Button type="link" size="small">处理</Button>
          </Popconfirm>
        )
      ),
    },
    {
      title: '触发时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
  ]

  const tabItems = [
    {
      key: 'rules',
      label: (
        <span>
          <BellOutlined />
          告警规则
        </span>
      ),
      children: (
        <>
          <div className="mb-4 flex justify-between">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加规则
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadRules}>
              刷新
            </Button>
          </div>
          <Table
            columns={ruleColumns}
            dataSource={rules}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'histories',
      label: (
        <span>
          <HistoryOutlined />
          告警历史
        </span>
      ),
      children: (
        <>
          <div className="mb-4 flex justify-between">
            <Button icon={<AlertOutlined />} onClick={handleCheck} loading={loading}>
              手动检测
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadHistories}>
              刷新
            </Button>
          </div>
          <Table
            columns={historyColumns}
            dataSource={histories}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">系统告警</h1>
        <p className="text-secondary mt-1">监控系统资源使用率，超过阈值时自动告警</p>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="总告警数"
                value={stats.total}
                prefix={<AlertOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="未处理"
                value={stats.unresolved}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已处理"
                value={stats.resolved}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最近24小时"
                value={stats.last_24h}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* 添加/编辑规则弹窗 */}
      <Modal
        title={editingRule ? '编辑告警规则' : '添加告警规则'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：CPU使用率过高" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="resource_type"
                label="资源类型"
                rules={[{ required: true, message: '请选择资源类型' }]}
              >
                <Select placeholder="选择资源类型">
                  <Option value="cpu">CPU</Option>
                  <Option value="memory">内存</Option>
                  <Option value="disk">磁盘</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="threshold"
                label="阈值 (%)"
                rules={[{ required: true, message: '请输入阈值' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="severity"
                label="严重程度"
                rules={[{ required: true, message: '请选择严重程度' }]}
              >
                <Select placeholder="选择严重程度">
                  <Option value="info">信息</Option>
                  <Option value="warning">警告</Option>
                  <Option value="critical">严重</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="check_interval_minutes"
                label="检查间隔（分钟）"
                rules={[{ required: true, message: '请输入检查间隔' }]}
              >
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="notify_method"
                label="通知方式"
                rules={[{ required: true, message: '请选择通知方式' }]}
              >
                <Select placeholder="选择通知方式">
                  <Option value="webhook">Webhook</Option>
                  <Option value="email">邮件</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cooldown_minutes"
                label="冷却时间（分钟）"
                rules={[{ required: true, message: '请输入冷却时间' }]}
              >
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.notify_method !== currentValues.notify_method
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('notify_method') === 'webhook' ? (
                <Form.Item
                  name="webhook_url"
                  label="Webhook URL"
                  rules={[{ required: true, message: '请输入Webhook URL' }]}
                >
                  <Input placeholder="https://..." />
                </Form.Item>
              ) : (
                <Form.Item
                  name="email_recipients"
                  label="邮件收件人"
                >
                  <Select mode="tags" placeholder="输入邮箱后回车">
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="is_enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="规则描述">
            <TextArea rows={3} placeholder="可选：描述规则的用途" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SystemAlerts
