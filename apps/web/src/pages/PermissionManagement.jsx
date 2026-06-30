/**
 * 权限管理页面（管理员）
 * 管理用户角色和权限
 */
import { useState, useEffect } from 'react'
import { Table, Tag, Select, Input, Button, Space, App, Modal, Transfer, Form, Popconfirm } from 'antd'
import { UserOutlined, SearchOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { permissionApi } from '@agent-monitor/api'

// 可分配的权限列表
const AVAILABLE_PERMISSIONS = [
  { key: 'view_dashboard', title: '查看仪表盘' },
  { key: 'view_agents', title: '查看 Agent 列表' },
  { key: 'view_execution_logs', title: '查看执行日志' },
  { key: 'view_full_execution', title: '查看完整执行结果' },
  { key: 'view_error_logs', title: '查看错误日志' },
  { key: 'manage_agents', title: '管理 Agent' },
  { key: 'manage_users', title: '管理用户' },
]

export default function PermissionManagement() {
  const { message } = App.useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [creating, setCreating] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    loadUsers()
  }, [pagination.current, pagination.pageSize, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await permissionApi.getUsers({
        page: pagination.current,
        per_page: pagination.pageSize,
        role: roleFilter || undefined,
        search: search || undefined
      })

      if (response.success) {
        setUsers(response.data.data)
        setPagination({
          ...pagination,
          total: response.data.total
        })
      }
    } catch (error) {
      console.error('加载用户失败:', error)
      message.error('加载用户失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建用户
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      setCreating(true)
      const response = await permissionApi.createUser({
        name: values.name,
        password: values.password,
        role: values.role || 'user',
      })
      if (response.success) {
        message.success('用户创建成功')
        setCreateModalOpen(false)
        createForm.resetFields()
        loadUsers()
      }
    } catch (error) {
      if (error.errorFields) return // 表单验证失败
      message.error('创建失败：' + (error.message || '未知错误'))
    } finally {
      setCreating(false)
    }
  }

  // 删除用户
  const handleDelete = async (userId) => {
    try {
      const response = await permissionApi.deleteUser(userId)
      if (response.success) {
        message.success('用户已删除')
        loadUsers()
      }
    } catch (error) {
      message.error('删除失败：' + (error.message || '未知错误'))
    }
  }

  // 更新用户角色
  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await permissionApi.updateRole(userId, newRole)
      if (response.success) {
        message.success('角色更新成功')
        loadUsers()
      }
    } catch (error) {
      message.error('更新失败：' + (error.message || '未知错误'))
    }
  }

  // 打开权限编辑弹窗
  const handleEditPermissions = (user) => {
    setEditingUser(user)
    setSelectedPermissions(user.permissions || [])
    setPermissionsModalOpen(true)
  }

  // 保存权限
  const handleSavePermissions = async () => {
    try {
      const response = await permissionApi.updatePermissions(editingUser.id, selectedPermissions)
      if (response.success) {
        message.success('权限更新成功')
        setPermissionsModalOpen(false)
        loadUsers()
      }
    } catch (error) {
      message.error('更新失败：' + (error.message || '未知错误'))
    }
  }

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span className="text-muted">{text}</span>
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role, record) => {
        return (
          <Select
            value={role}
            style={{ width: 120 }}
            onChange={(value) => handleRoleChange(record.id, value)}
            options={[
              { value: 'user', label: '普通用户' },
              { value: 'vip', label: 'VIP 用户' },
              { value: 'support', label: '客服' },
              { value: 'admin', label: '管理员' }
            ]}
          />
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'error'}>
          {status === 'active' ? '正常' : '禁用'}
        </Tag>
      )
    },
    {
      title: '权限',
      key: 'permissions',
      render: (_, record) => {
        const permissions = record.permissions || []
        return (
          <Button 
            type="link" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPermissions(record)}
          >
            {permissions.length > 0 ? `${permissions.length} 项权限` : '设置权限'}
          </Button>
        )
      }
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (text) => {
        if (!text) return <span className="text-muted">-</span>
        return <span className="text-muted">{new Date(text).toLocaleString('zh-CN')}</span>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确定删除该用户？"
          description="删除后不可恢复"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ]

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">权限管理</h1>
        <p className="text-secondary mt-1">管理用户角色和查看权限</p>
      </div>

      {/* 筛选栏 */}
      <div className="card mb-6">
        <div className="card-body">
          <Space>
            <Input
              placeholder="搜索用户名或邮箱"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={loadUsers}
              style={{ width: 250 }}
            />
            <Select
              placeholder="按角色筛选"
              allowClear
              style={{ width: 150 }}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value)
                setPagination({ ...pagination, current: 1 })
              }}
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'support', label: '客服' },
                { value: 'vip', label: 'VIP 用户' },
                { value: 'user', label: '普通用户' }
              ]}
            />
            <Button type="primary" onClick={loadUsers}>搜索</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              新增用户
            </Button>
          </Space>
        </div>
      </div>

      {/* 表格 */}
      <div className="card">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={(pag) => setPagination(pag)}
        />
      </div>

      {/* 新增用户弹窗 */}
      <Modal
        title="新增用户"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          createForm.resetFields()
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和短横线' },
              { max: 50, message: '不能超过50个字符' },
            ]}
          >
            <Input placeholder="输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码不能少于6位' },
            ]}
          >
            <Input.Password placeholder="输入密码" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            initialValue="user"
          >
            <Select
              options={[
                { value: 'user', label: '普通用户' },
                { value: 'vip', label: 'VIP 用户' },
                { value: 'support', label: '客服' },
                { value: 'admin', label: '管理员' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限编辑弹窗 */}
      <Modal
        title={`编辑权限 - ${editingUser?.name}`}
        open={permissionsModalOpen}
        onCancel={() => setPermissionsModalOpen(false)}
        onOk={handleSavePermissions}
        width={600}
      >
        <Transfer
          dataSource={AVAILABLE_PERMISSIONS}
          targetKeys={selectedPermissions}
          onChange={(targetKeys) => setSelectedPermissions(targetKeys)}
          render={(item) => item.title}
          titles={['未分配', '已分配']}
          listStyle={{
            width: 250,
            height: 300,
          }}
        />
      </Modal>
    </div>
  )
}
