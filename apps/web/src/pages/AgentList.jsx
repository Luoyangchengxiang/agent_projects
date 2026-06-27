import { useState, useEffect } from 'react'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { Table, Tag, Button, Input, Space, App, Modal, Form, Select, Tooltip } from 'antd'
import { agentApi } from '@agent-monitor/api'

// 受保护的 Agent ID（开店团队及其成员，不可编辑/删除）
const PROTECTED_IDS = [1, 2, 3, 4, 5, 7]

function AgentList() {
  const { message, modal } = App.useApp()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 弹框状态
  const [viewVisible, setViewVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [currentAgent, setCurrentAgent] = useState(null)
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 执行弹框状态
  const [runVisible, setRunVisible] = useState(false)
  const [runInput, setRunInput] = useState('')
  const [runLoading, setRunLoading] = useState(false)
  const [runResult, setRunResult] = useState(null)

  useEffect(() => {
    loadAgents()
  }, [pagination.current, pagination.pageSize, statusFilter])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const response = await agentApi.getList({
        page: pagination.current,
        per_page: pagination.pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined
      })
      
      if (response.success) {
        setAgents(response.data.data)
        setPagination({
          ...pagination,
          total: response.data.total
        })
      }
    } catch (error) {
      console.error('加载Agent列表失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 查看详情
  const handleView = (record) => {
    setCurrentAgent(record)
    setViewVisible(true)
  }

  // 编辑
  const handleEdit = (record) => {
    if (PROTECTED_IDS.includes(record.id)) {
      message.warning('系统内置Agent不可编辑')
      return
    }
    setCurrentAgent(record)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      model: record.config?.model || '',
      prompt: record.config?.prompt || '',
    })
    setEditVisible(true)
  }

  // 保存编辑
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await agentApi.update(currentAgent.id, {
        name: values.name,
        type: values.type,
        config: {
          model: values.model,
          prompt: values.prompt,
        }
      })
      message.success('更新成功')
      setEditVisible(false)
      loadAgents()
    } catch (error) {
      if (error.errorFields) return
      message.error('更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 创建新 Agent
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      setSubmitting(true)
      await agentApi.create({
        name: values.name,
        type: values.type,
        config: {
          model: values.model,
          prompt: values.prompt,
        }
      })
      message.success('创建成功')
      setCreateVisible(false)
      createForm.resetFields()
      loadAgents()
    } catch (error) {
      if (error.errorFields) return
      message.error('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除
  const handleDelete = (record) => {
    if (PROTECTED_IDS.includes(record.id)) {
      message.warning('系统内置Agent不可删除')
      return
    }
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除 Agent「${record.name}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await agentApi.delete(record.id)
          message.success('删除成功')
          loadAgents()
        } catch (error) {
          message.error('删除失败')
        }
      }
    })
  }

  // 执行 Agent
  const handleRun = (record) => {
    setCurrentAgent(record)
    setRunInput('')
    setRunResult(null)
    setRunVisible(true)
  }

  // 提交执行
  const handleRunSubmit = async () => {
    if (!runInput.trim()) {
      message.warning('请输入内容')
      return
    }
    setRunLoading(true)
    setRunResult(null)
    try {
      const res = await agentApi.run(currentAgent.id, { input: runInput })
      setRunResult(res.data)
      if (res.success) {
        message.success('执行完成')
      } else {
        message.warning('执行完成但有错误')
      }
      loadAgents() // 刷新状态
    } catch (error) {
      setRunResult(error?.data || { status: 'failed', error: '请求失败' })
      message.error('执行失败')
    } finally {
      setRunLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (text) => {
    if (!text) return '-'
    const d = new Date(text)
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour12: false })
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span className="text-primary font-medium">
          {text}
          {PROTECTED_IDS.includes(record.id) && (
            <Tooltip title="系统内置，不可编辑">
              <LockOutlined style={{ marginLeft: 6, color: '#f59e0b', fontSize: 12 }} />
            </Tooltip>
          )}
        </span>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => {
        const map = { local: { color: 'blue', text: '本地' }, online: { color: 'green', text: '线上' }, team: { color: 'purple', text: '团队' } }
        const item = map[type] || { color: 'default', text: type }
        return <Tag color={item.color}>{item.text}</Tag>
      }
    },
    {
      title: '模型',
      key: 'model',
      width: 120,
      render: (_, record) => <span className="text-muted">{record.model || record.config?.model || '-'}</span>
    },
    {
      title: '执行器',
      key: 'executor_type',
      width: 80,
      render: (_, record) => {
        const map = { ollama: { color: 'cyan', text: 'Ollama' }, api: { color: 'orange', text: 'API' }, shell: { color: 'red', text: 'Shell' } }
        const item = map[record.executor_type] || { color: 'default', text: record.executor_type }
        return <Tag color={item.color}>{item.text}</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const colorMap = { online: 'success', offline: 'default', error: 'error' }
        const textMap = { online: '在线', offline: '离线', error: '错误' }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      width: 160,
      render: (text) => <span className="text-muted">{formatTime(text)}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => {
        const isProtected = PROTECTED_IDS.includes(record.id)
        return (
          <Space>
            <Tooltip title="执行任务">
              <Button
                type="text"
                icon={<CaretRightOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleRun(record)}
              />
            </Tooltip>
            <Tooltip title="查看详情">
              <Button type="text" icon={<EyeOutlined />} className="text-primary" onClick={() => handleView(record)} />
            </Tooltip>
            <Tooltip title={isProtected ? '系统内置，不可编辑' : '编辑'}>
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                className={isProtected ? 'text-muted' : 'text-warning'}
                disabled={isProtected}
                onClick={() => handleEdit(record)} 
              />
            </Tooltip>
            <Tooltip title={isProtected ? '系统内置，不可删除' : '删除'}>
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                className={isProtected ? 'text-muted' : 'text-error'}
                disabled={isProtected}
                onClick={() => handleDelete(record)} 
              />
            </Tooltip>
          </Space>
        )
      }
    }
  ]

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Agent列表</h1>
          <p className="text-secondary mt-1">管理所有智能体</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
          添加Agent
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="card mb-6">
        <div className="card-body">
          <Space>
            <Input
              placeholder="搜索Agent名称..."
              prefix={<SearchOutlined className="text-muted" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={() => { setPagination({ ...pagination, current: 1 }); loadAgents() }}
              className="w-64"
            />
            <Select
              placeholder="状态筛选"
              allowClear
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPagination({ ...pagination, current: 1 }) }}
              className="w-32"
              options={[
                { value: 'online', label: '在线' },
                { value: 'offline', label: '离线' },
                { value: 'error', label: '错误' },
              ]}
            />
            <Button type="primary" onClick={() => { setPagination({ ...pagination, current: 1 }); loadAgents() }}>搜索</Button>
          </Space>
        </div>
      </div>

      {/* 表格 */}
      <div className="card">
        <Table
          columns={columns}
          dataSource={agents}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={setPagination}
        />
      </div>

      {/* 查看详情弹框 */}
      <Modal
        title="Agent 详情"
        open={viewVisible}
        onCancel={() => setViewVisible(false)}
        footer={<Button onClick={() => setViewVisible(false)}>关闭</Button>}
        width={600}
      >
        {currentAgent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>名称</label>
                <p style={{ color: '#e5e7eb', margin: '4px 0 0' }}>{currentAgent.name}</p>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>类型</label>
                <p style={{ margin: '4px 0 0' }}>
                  <Tag color={currentAgent.type === 'local' ? 'blue' : currentAgent.type === 'team' ? 'purple' : 'green'}>
                    {currentAgent.type === 'local' ? '本地' : currentAgent.type === 'team' ? '团队' : '线上'}
                  </Tag>
                </p>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>状态</label>
                <p style={{ margin: '4px 0 0' }}>
                  <Tag color={currentAgent.status === 'online' ? 'success' : currentAgent.status === 'error' ? 'error' : 'default'}>
                    {currentAgent.status === 'online' ? '在线' : currentAgent.status === 'error' ? '错误' : '离线'}
                  </Tag>
                </p>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>模型</label>
                <p style={{ color: '#e5e7eb', margin: '4px 0 0' }}>{currentAgent.config?.model || '-'}</p>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>最后活跃</label>
                <p style={{ color: '#e5e7eb', margin: '4px 0 0' }}>{formatTime(currentAgent.last_active_at)}</p>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12 }}>创建时间</label>
                <p style={{ color: '#e5e7eb', margin: '4px 0 0' }}>{formatTime(currentAgent.created_at)}</p>
              </div>
            </div>

            {/* Prompt 内容 */}
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12 }}>Prompt 配置</label>
              <pre style={{
                background: '#1a1d24',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 8,
                color: '#e5e7eb',
                fontSize: 13,
                lineHeight: 1.6,
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {currentAgent.config?.prompt || '（未配置 Prompt）'}
              </pre>
            </div>

            {/* 完整 config JSON */}
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12 }}>完整配置 (JSON)</label>
              <pre style={{
                background: '#1a1d24',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 8,
                color: '#8b949e',
                fontSize: 12,
                lineHeight: 1.5,
                maxHeight: 200,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {JSON.stringify(currentAgent.config || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑弹框 */}
      <Modal
        title="编辑 Agent"
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={handleEditSubmit}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入Agent名称' }]}>
            <Input placeholder="例如：选品专家" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择类型">
              <Select.Option value="local">本地</Select.Option>
              <Select.Option value="online">线上</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Input placeholder="例如：qwen2.5:3b" />
          </Form.Item>
          <Form.Item name="prompt" label="Prompt">
            <Input.TextArea rows={6} placeholder="输入 Agent 的系统提示词..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建弹框 */}
      <Modal
        title="添加新 Agent"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="创建"
        cancelText="取消"
        width={500}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入Agent名称' }]}>
            <Input placeholder="例如：客服小助手" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="选择类型">
              <Select.Option value="local">本地</Select.Option>
              <Select.Option value="online">线上</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Input placeholder="例如：qwen2.5:3b" />
          </Form.Item>
          <Form.Item name="prompt" label="Prompt">
            <Input.TextArea rows={6} placeholder="输入 Agent 的系统提示词..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行弹框 */}
      <Modal
        title={
          <span>
            <CaretRightOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            执行 Agent — {currentAgent?.name}
          </span>
        }
        open={runVisible}
        onCancel={() => setRunVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRunVisible(false)}>关闭</Button>,
          <Button
            key="run"
            type="primary"
            icon={runLoading ? <LoadingOutlined /> : <CaretRightOutlined />}
            loading={runLoading}
            onClick={handleRunSubmit}
            disabled={!runInput.trim()}
          >
            {runLoading ? '执行中...' : '执行'}
          </Button>,
        ]}
        width={700}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 输入区 */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4, display: 'block' }}>输入内容</label>
            <Input.TextArea
              rows={3}
              placeholder="输入要发送给 Agent 的内容..."
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              onPressEnter={(e) => {
                if (e.ctrlKey || e.metaKey) handleRunSubmit()
              }}
              disabled={runLoading}
            />
            <span style={{ color: '#6b7280', fontSize: 11 }}>Ctrl+Enter 快速执行</span>
          </div>

          {/* 执行结果 */}
          {runResult && (
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4, display: 'block' }}>
                执行结果
                {runResult.status === 'success' ? (
                  <Tag color="success" style={{ marginLeft: 8 }}>
                    <CheckCircleOutlined /> 成功 · {runResult.duration_formatted}
                  </Tag>
                ) : (
                  <Tag color="error" style={{ marginLeft: 8 }}>
                    <CloseCircleOutlined /> 失败 · {runResult.duration_formatted}
                  </Tag>
                )}
              </label>
              <pre style={{
                background: '#1a1d24',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 4,
                color: runResult.status === 'success' ? '#e5e7eb' : '#f87171',
                fontSize: 13,
                lineHeight: 1.6,
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {runResult.status === 'success' ? runResult.output : (runResult.error || '未知错误')}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default AgentList
