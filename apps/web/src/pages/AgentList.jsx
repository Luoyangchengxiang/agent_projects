import { useState, useEffect } from 'react'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { Table, Tag, Button, Input, Space, message } from 'antd'
import { agentApi } from '@agent-monitor/api'

function AgentList() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  useEffect(() => {
    loadAgents()
  }, [pagination.current, pagination.pageSize])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const response = await agentApi.getList({
        page: pagination.current,
        per_page: pagination.pageSize,
        search: searchText || undefined
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

  const handleDelete = async (id) => {
    try {
      const response = await agentApi.delete(id)
      if (response.success) {
        message.success('删除成功')
        loadAgents()
      }
    } catch (error) {
      message.error('删除失败')
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
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="text-primary font-medium">{text}</span>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'local' ? 'blue' : 'green'}>
          {type === 'local' ? '本地' : '线上'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          online: 'success',
          offline: 'default',
          error: 'error'
        }
        const textMap = {
          online: '在线',
          offline: '离线',
          error: '错误'
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      render: (text) => <span className="text-muted">{text || '-'}</span>
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => <span className="text-muted">{text}</span>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} className="text-primary" />
          <Button type="text" icon={<EditOutlined />} className="text-warning" />
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

  const handleTableChange = (pag) => {
    setPagination(pag)
  }

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 })
    loadAgents()
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Agent列表</h1>
          <p className="text-secondary mt-1">管理所有智能体</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />}>
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
              onPressEnter={handleSearch}
              className="w-64"
            />
            <Button type="primary" onClick={handleSearch}>搜索</Button>
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
          onChange={handleTableChange}
        />
      </div>
    </div>
  )
}

export default AgentList
