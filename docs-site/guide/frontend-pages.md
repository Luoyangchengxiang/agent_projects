# 页面开发

## 页面列表

项目共有 13 个页面，位于 `src/pages/` 目录：

| 页面 | 文件 | 说明 |
|------|------|------|
| 仪表盘 | `Dashboard.jsx` | 系统概览、统计卡片、图表 |
| Agent 列表 | `AgentList.jsx` | Agent CRUD、状态管理 |
| 执行日志 | `ExecutionLogs.jsx` | 任务执行记录列表 |
| 错误日志 | `ErrorLogs.jsx` | 错误记录、解决标记 |
| 错误告警 | `AlertRules.jsx` | 告警规则管理 |
| 性能监控 | `Metrics.jsx` | CPU/内存/响应时间图表 |
| 知识图谱 | `KnowledgeGraph.jsx` | ECharts + G6 双引擎 |
| 定时任务 | `CronJobs.jsx` | CronJob CRUD、暂停/恢复 |
| 数据报告 | `Reports.jsx` | 周报/月报/选品报告 |
| 客服系统 | `Chat.jsx` | AI + 人工接管聊天 |
| 版本更新 | `VersionUpdates.jsx` | 版本记录管理 |
| 权限管理 | `Permissions.jsx` | 角色权限控制 |
| 设置 | `Settings.jsx` | 个人设置、看板娘 |

## 页面开发模式

每个页面遵循相同结构：

```jsx
import { useState, useEffect } from 'react'
import { Table, Button, message } from 'antd'
import { xxxApi } from '../services/xxxApi'

export default function XxxPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  // 加载数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await xxxApi.list()
      setData(res.data || [])
    } catch (err) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div>
      <h2>页面标题</h2>
      <Table
        loading={loading}
        dataSource={data}
        columns={[/* 列定义 */]}
        rowKey="id"
      />
    </div>
  )
}
```

## 路由配置

路由在 `src/App.jsx` 中通过 React Router 配置：

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/errors" element={<ErrorLogs />} />
        {/* ...其他路由 */}
      </Routes>
    </BrowserRouter>
  )
}
```

## 布局组件

所有页面包裹在 `MainLayout` 中，包含：

- **Header** — 顶部导航、通知中心、用户菜单
- **Sidebar** — 左侧菜单导航
- **Content** — 页面内容区

```jsx
// components/MainLayout.jsx
import { Layout } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = Layout

export default function MainLayout({ children }) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ padding: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
```

## 暗色主题

全局使用 Ant Design 暗色主题，通过 `ConfigProvider` 配置：

```jsx
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

<ConfigProvider
  locale={zhCN}
  theme={{
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#1677ff',
    },
  }}
>
  <App />
</ConfigProvider>
```

### 暗色弹框覆盖

Ant Design 的静态方法（`message.error`、`Modal.confirm`）不继承 `ConfigProvider`，需要在 `variables.css` 中全局覆盖：

```css
/* 全局覆盖暗色弹框 */
.ant-message .ant-message-notice-content {
  background: #1f1f1f !important;
  color: #ffffff !important;
}

.ant-modal .ant-modal-content {
  background: #1f1f1f !important;
}

.ant-popconfirm .ant-popover-inner {
  background: #1f1f1f !important;
}
```

## 表格通用配置

所有表格添加分页、排序：

```jsx
<Table
  dataSource={data}
  columns={columns}
  rowKey="id"
  pagination={{
    pageSize: 20,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
  scroll={{ x: 'max-content' }}
/>
```
