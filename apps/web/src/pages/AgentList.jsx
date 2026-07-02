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
  CloseCircleOutlined,
  UndoOutlined,
  TeamOutlined,
  UserOutlined,
  RobotOutlined,
  SyncOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import { Table, Tag, Button, Input, Space, App, Modal, Form, Select, Tooltip, Typography, Descriptions } from 'antd'
import { agentApi } from '@agent-monitor/api'
import ExecutionStrategyEditor from '../components/ExecutionStrategyEditor'

const { Title } = Typography

function AgentList() {
  const { message, modal } = App.useApp()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [showTrash, setShowTrash] = useState(false)
  const [userRole, setUserRole] = useState('user')
  const [currentUserId, setCurrentUserId] = useState(null)

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

  // 执行策略状态
  const [executionStrategy, setExecutionStrategy] = useState(null)

  useEffect(() => {
    // 获取用户信息（注意：API用的key是auth_user）
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}')
    setUserRole(user.role || 'user')
    setCurrentUserId(user.id)
    loadAgents()
  }, [statusFilter, showTrash])

  const loadAgents = async () => {
    setLoading(true)
    try {
      if (showTrash) {
        // 加载已删除的
        const response = await agentApi.getTrash()
        if (response.success) {
          setAgents(response.data.data || [])
        }
      } else {
        // 加载树状结构
        const response = await agentApi.getList({
          tree: true,
          search: searchText || undefined,
          status: statusFilter || undefined
        })
        
        if (response.success) {
          setAgents(response.data || [])
        }
      }
    } catch (error) {
      console.error('加载Agent列表失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 搜索
  const handleSearch = () => {
    loadAgents()
  }

  // 查看详情
  const handleView = (record) => {
    setCurrentAgent(record)
    setViewVisible(true)
  }

  // 编辑
  const handleEdit = (record) => {
    setCurrentAgent(record)
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      model: record.model || record.config?.model || '',
      prompt: record.system_prompt || record.config?.prompt || '',
    })
    // 加载执行策略（仅组）
    if (record.is_group) {
      setExecutionStrategy(record.execution_strategy || null)
    }
    setEditVisible(true)
  }

  // 保存编辑
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      
      const updateData = {
        name: values.name,
        type: values.type,
        model: values.model,
        system_prompt: values.prompt,
      }
      
      // 如果是组，添加执行策略
      if (currentAgent.is_group) {
        updateData.execution_strategy = executionStrategy
      }
      
      await agentApi.update(currentAgent.id, updateData)
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
        parent_id: values.parent_id || null,
        model: values.model,
        system_prompt: values.prompt,
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

  // 逻辑删除
  const handleDelete = (record) => {
    const isGroup = record.is_group
    const content = isGroup 
      ? `确定要删除团队「${record.name}」及其所有成员吗？删除后可在回收站恢复。`
      : `确定要删除 Agent「${record.name}」吗？删除后可在回收站恢复。`
    
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await agentApi.delete(record.id)
          message.success('删除成功')
          loadAgents()
        } catch (error) {
          if (error.status === 403) {
            message.error('无权删除此Agent')
          } else {
            message.error('删除失败')
          }
        }
      }
    })
  }

  // 恢复删除
  const handleRestore = (record) => {
    modal.confirm({
      title: '确认恢复',
      icon: <ExclamationCircleOutlined />,
      content: `确定要恢复「${record.name}」吗？`,
      okText: '恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          await agentApi.restore(record.id)
          message.success('恢复成功')
          loadAgents()
        } catch (error) {
          if (error.status === 403) {
            message.error('只有管理员可以恢复')
          } else {
            message.error('恢复失败')
          }
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
      loadAgents()
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

  // 同步 Modelfile
  const [syncing, setSyncing] = useState(false)
  const handleSyncFromLocal = async () => {
    setSyncing(true)
    try {
      const res = await agentApi.syncFromLocal()
      if (res.success) {
        const count = res.data?.length || 0
        message.success(`本地 → 数据库同步完成，${count} 个 Agent 已更新`)
        loadAgents()
      } else {
        message.warning(res.message || '同步完成，无变更')
      }
    } catch (e) {
      message.error('同步失败: ' + (e.message || '未知错误'))
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncToLocal = async () => {
    setSyncing(true)
    try {
      const res = await agentApi.syncToLocal()
      if (res.success) {
        const count = res.data?.length || 0
        message.success(`数据库 → 本地同步完成，${count} 个 Modelfile 已更新`)
      } else {
        message.warning(res.message || '同步完成，无变更')
      }
    } catch (e) {
      message.error('同步失败: ' + (e.message || '未知错误'))
    } finally {
      setSyncing(false)
    }
  }

  // 判断是否可以删除/编辑
  const canModify = (record) => {
    if (userRole === 'admin') return true
    // 普通用户只能删除自己创建的
    return record.created_by && record.created_by === currentUserId
  }

  // 树状表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const isGroup = record.is_group
        return (
          <span className="font-medium">
            {isGroup ? (
              <TeamOutlined style={{ marginRight: 8, color: '#722ed1' }} />
            ) : (
              <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            )}
            {text}
          </span>
        )
      }
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const map = { 
          local: { color: 'blue', text: '本地' }, 
          online: { color: 'green', text: '线上' }, 
          team: { color: 'purple', text: '团队' } 
        }
        const item = map[type] || { color: 'default', text: type }
        return <Tag color={item.color}>{item.text}</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => {
        const isGroup = record.is_group
        if (isGroup) {
          // 组状态：根据子级状态判断
          const children = record.children || []
          const onlineCount = children.filter(c => c.status === 'online').length
          return <Tag color="purple">{onlineCount}/{children.length} 在线</Tag>
        }
        const colorMap = { online: 'success', offline: 'default', error: 'error' }
        const textMap = { online: '在线', offline: '离线', error: '错误' }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '执行器/模型',
      key: 'executor',
      width: 200,
      render: (_, record) => {
        if (record.is_group) {
          return <span className="text-muted">-</span>
        }
        const executorMap = { 
          ollama: { color: 'cyan', text: 'Ollama' }, 
          api: { color: 'orange', text: 'API' }, 
          shell: { color: 'red', text: 'Shell' } 
        }
        const executor = executorMap[record.executor_type] || { color: 'default', text: record.executor_type }
        return (
          <Space size={4} wrap={false}>
            <Tag color={executor.color} style={{ margin: 0 }}>{executor.text}</Tag>
            {record.model && <Tag color="blue" style={{ margin: 0 }}>{record.model}</Tag>}
          </Space>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => <span className="text-muted">{formatTime(text)}</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const isGroup = record.is_group
        const isTrash = showTrash
        
        if (isTrash) {
          // 回收站操作
          return (
            <Space>
              {userRole === 'admin' && (
                <Tooltip title="恢复">
                  <Button 
                    type="text" 
                    icon={<UndoOutlined />} 
                    style={{ color: '#52c41a' }}
                    onClick={() => handleRestore(record)} 
                  />
                </Tooltip>
              )}
            </Space>
          )
        }
        
        return (
          <Space>
            {isGroup ? (
              // 组操作
              <>
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
                <Tooltip title="编辑">
                  <Button type="text" icon={<EditOutlined />} className="text-primary" onClick={() => handleEdit(record)} />
                </Tooltip>
                {canModify(record) && (
                  <Tooltip title="删除">
                    <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
                  </Tooltip>
                )}
              </>
            ) : (
              // 子级操作
              <>
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
                <Tooltip title="编辑">
                  <Button type="text" icon={<EditOutlined />} className="text-primary" onClick={() => handleEdit(record)} />
                </Tooltip>
                {canModify(record) && (
                  <Tooltip title="删除">
                    <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record)} />
                  </Tooltip>
                )}
              </>
            )}
          </Space>
        )
      }
    },
  ]

  // 获取所有顶级 Agent（用于创建子级时选择父级）
  const getRootAgents = () => {
    return agents.filter(a => a.is_group || a.children)
  }

  return (
    <div>
      {/* 标题栏 - 与其他页面保持一致 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          智能体管理
        </Title>
        <Space>
          {!showTrash && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setCreateVisible(true)}
            >
              新建 Agent
            </Button>
          )}
          {userRole === 'admin' && (
            <Button 
              icon={showTrash ? <TeamOutlined /> : <DeleteOutlined />}
              onClick={() => setShowTrash(!showTrash)}
            >
              {showTrash ? '返回列表' : '回收站'}
            </Button>
          )}
          {!showTrash && userRole === 'admin' && (
            <Tooltip title="从本地 Modelfile 同步到数据库">
              <Button
                icon={<SyncOutlined spin={syncing} />}
                onClick={handleSyncFromLocal}
                loading={syncing}
              >
                本地 → DB
              </Button>
            </Tooltip>
          )}
          {!showTrash && userRole === 'admin' && (
            <Tooltip title="从数据库同步到本地 Modelfile">
              <Button
                icon={<SyncOutlined spin={syncing} />}
                onClick={handleSyncToLocal}
                loading={syncing}
              >
                DB → 本地
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 搜索和筛选 */}
      {!showTrash && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="搜索Agent名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 120 }}
            >
              <Select.Option value="online">在线</Select.Option>
              <Select.Option value="offline">离线</Select.Option>
              <Select.Option value="error">错误</Select.Option>
            </Select>
            <Button onClick={loadAgents}>刷新</Button>
          </Space>
        </div>
      )}

      {/* Agent 列表 */}
      <Table
        columns={columns}
        dataSource={agents}
        loading={loading}
        rowKey="id"
        pagination={false}
        expandable={{
          childrenColumnName: 'children',
          defaultExpandAllRows: true,
          expandIcon: ({ expanded, onExpand, record }) => {
            // 非组不显示展开图标
            if (!record.is_group) {
              return <span style={{ display: 'inline-block', width: 16 }} />;
            }
            // 组显示展开/收起图标
            return (
              <span
                onClick={(e) => onExpand(record, e)}
                style={{
                  cursor: 'pointer',
                  fontSize: 10,
                  marginRight: 4,
                  transition: 'transform 0.2s',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                ▶
              </span>
            );
          },
        }}
      />

      {/* 查看详情弹框 */}
      <Modal
        title="智能体详情"
        open={viewVisible}
        onCancel={() => setViewVisible(false)}
        footer={null}
        width={currentAgent?.is_group && currentAgent?.execution_strategy ? 800 : 600}
      >
        {currentAgent && (
          <div>
            {/* 基本信息 */}
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="名称" span={2}>
                <Space>
                  {currentAgent.is_group ? <TeamOutlined style={{ color: '#722ed1' }} /> : <UserOutlined style={{ color: '#1890ff' }} />}
                  <span style={{ fontWeight: 500 }}>{currentAgent.name}</span>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="类型">
                {(() => {
                  const typeMap = { local: { color: 'blue', text: '本地' }, online: { color: 'green', text: '线上' }, team: { color: 'purple', text: '团队' } }
                  const item = typeMap[currentAgent.type] || { color: 'default', text: currentAgent.type }
                  return <Tag color={item.color}>{item.text}</Tag>
                })()}
              </Descriptions.Item>
              
              <Descriptions.Item label="状态">
                {currentAgent.is_group ? (
                  (() => {
                    const children = currentAgent.children || []
                    const onlineCount = children.filter(c => c.status === 'online').length
                    return <Tag color="purple">{onlineCount}/{children.length} 在线</Tag>
                  })()
                ) : (
                  (() => {
                    const statusMap = { online: { color: 'success', text: '在线' }, offline: { color: 'default', text: '离线' }, error: { color: 'error', text: '错误' } }
                    const item = statusMap[currentAgent.status] || { color: 'default', text: currentAgent.status }
                    return <Tag color={item.color}>{item.text}</Tag>
                  })()
                )}
              </Descriptions.Item>
              
              {!currentAgent.is_group && currentAgent.executor_type && (
                <Descriptions.Item label="执行器">
                  {(() => {
                    const executorMap = { ollama: { color: 'cyan', text: 'Ollama' }, api: { color: 'orange', text: 'API' }, shell: { color: 'red', text: 'Shell' } }
                    const item = executorMap[currentAgent.executor_type] || { color: 'default', text: currentAgent.executor_type }
                    return <Tag color={item.color}>{item.text}</Tag>
                  })()}
                </Descriptions.Item>
              )}
              
              {!currentAgent.is_group && currentAgent.model && (
                <Descriptions.Item label="模型">
                  <Tag>{currentAgent.model}</Tag>
                </Descriptions.Item>
              )}
              
              <Descriptions.Item label="创建时间" span={currentAgent.is_group ? 2 : 1}>
                {formatTime(currentAgent.created_at)}
              </Descriptions.Item>
              
              {!currentAgent.is_group && (
                <Descriptions.Item label="更新时间">
                  {formatTime(currentAgent.updated_at)}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            {/* 团队成员列表 */}
            {currentAgent.children && currentAgent.children.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>团队成员</div>
                <Table
                  dataSource={currentAgent.children}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '名称',
                      dataIndex: 'name',
                      key: 'name',
                      render: (text) => (
                        <Space>
                          <UserOutlined style={{ color: '#1890ff' }} />
                          {text}
                        </Space>
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
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      width: 80,
                      render: (status) => {
                        const map = { online: { color: 'success', text: '在线' }, offline: { color: 'default', text: '离线' }, error: { color: 'error', text: '错误' } }
                        const item = map[status] || { color: 'default', text: status }
                        return <Tag color={item.color}>{item.text}</Tag>
                      }
                    },
                    {
                      title: '执行器',
                      key: 'executor',
                      width: 100,
                      render: (_, record) => {
                        const map = { ollama: { color: 'cyan', text: 'Ollama' }, api: { color: 'orange', text: 'API' }, shell: { color: 'red', text: 'Shell' } }
                        const item = map[record.executor_type] || { color: 'default', text: record.executor_type || '-' }
                        return <Tag color={item.color}>{item.text}</Tag>
                      }
                    }
                  ]}
                />
              </div>
            )}

            {/* 执行策略（仅组） */}
            {currentAgent.is_group && currentAgent.execution_strategy && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  <Space>
                    <BranchesOutlined />
                    执行策略
                  </Space>
                </div>
                <ExecutionStrategyEditor
                  value={currentAgent.execution_strategy}
                  agents={currentAgent.children || []}
                  readOnly={true}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑弹框 */}
      <Modal
        title={currentAgent?.is_group ? "编辑团队" : "编辑 Agent"}
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={handleEditSubmit}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={currentAgent?.is_group ? 800 : 520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select disabled={currentAgent?.is_group}>
              <Select.Option value="local">本地</Select.Option>
              <Select.Option value="online">线上</Select.Option>
              <Select.Option value="team">团队</Select.Option>
            </Select>
          </Form.Item>
          
          {/* 非组显示模型和提示词 */}
          {!currentAgent?.is_group && (
            <>
              <Form.Item name="model" label="模型">
                <Input placeholder="如 qwen2.5:3b" />
              </Form.Item>
              <Form.Item name="prompt" label="系统提示词">
                <Input.TextArea rows={4} />
              </Form.Item>
            </>
          )}
          
          {/* 组显示执行策略 */}
          {currentAgent?.is_group && (
            <Form.Item label="执行策略">
              <ExecutionStrategyEditor
                value={executionStrategy}
                onChange={setExecutionStrategy}
                agents={currentAgent?.children || []}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 创建弹框 */}
      <Modal
        title="新建 Agent"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select>
              <Select.Option value="local">本地</Select.Option>
              <Select.Option value="online">线上</Select.Option>
              <Select.Option value="team">团队</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="parent_id" label="所属团队">
            <Select allowClear placeholder="留空为顶级">
              {getRootAgents().map(agent => (
                <Select.Option key={agent.id} value={agent.id}>{agent.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Input placeholder="如 qwen2.5:3b" />
          </Form.Item>
          <Form.Item name="prompt" label="系统提示词">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行弹框 */}
      <Modal
        title={`执行任务 - ${currentAgent?.name}`}
        open={runVisible}
        onCancel={() => setRunVisible(false)}
        footer={null}
        width={700}
      >
        <div>
          <Input.TextArea
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            placeholder="请输入执行内容..."
            rows={4}
            disabled={runLoading}
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setRunVisible(false)}>取消</Button>
              <Button 
                type="primary" 
                onClick={handleRunSubmit}
                loading={runLoading}
                icon={<CaretRightOutlined />}
              >
                执行
              </Button>
            </Space>
          </div>
          
          {/* 执行结果 */}
          {runResult && (
            <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <h4>执行结果</h4>
              {Array.isArray(runResult) ? (
                // 组执行结果
                <div>
                  {runResult.map((result, index) => (
                    <div key={index} style={{ marginBottom: 8 }}>
                      <Tag color={result.status === 'success' ? 'success' : 'error'}>
                        {result.agent_name}
                      </Tag>
                      {result.status === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      {result.duration && <span className="text-muted"> ({result.duration}ms)</span>}
                    </div>
                  ))}
                </div>
              ) : (
                // 单个执行结果
                <div>
                  <p><strong>状态：</strong>
                    <Tag color={runResult.status === 'success' ? 'success' : 'error'}>
                      {runResult.status}
                    </Tag>
                  </p>
                  {runResult.duration_formatted && <p><strong>耗时：</strong>{runResult.duration_formatted}</p>}
                  {runResult.output && (
                    <div>
                      <strong>输出：</strong>
                      <pre style={{ background: '#fff', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                        {runResult.output}
                      </pre>
                    </div>
                  )}
                  {runResult.error && (
                    <div>
                      <strong>错误：</strong>
                      <pre style={{ background: '#fff2f0', padding: 8, borderRadius: 4, color: '#ff4d4f' }}>
                        {runResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default AgentList
