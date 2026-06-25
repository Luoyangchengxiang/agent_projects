# Agent监控系统实现计划

> **创建时间**: 2026年6月23日
> **遵循规则**: Karpathy行为准则
> **设计原则**: design-taste-frontend + Ant Design功能组件

---

## 一、项目概述

### 目标
构建一个本地部署的Agent监控系统，支持查看线上/本地Agent的执行日志、执行进度、产出监控等功能。

### 技术栈

| 层级 | 技术方案 |
|------|----------|
| **前端框架** | React 18 + Vite |
| **包管理** | pnpm workspace（Monorepo） |
| **UI组件库** | Ant Design 5（功能组件） |
| **自定义设计** | CSS Variables + Tailwind CSS（主界面） |
| **状态管理** | Zustand |
| **路由** | React Router 6 |
| **数据获取** | Axios + TanStack Query |
| **图表** | ECharts |
| **后端** | Laravel 11 + Sanctum |
| **数据库** | PostgreSQL + TimescaleDB + Redis |

### 设计理念

| 维度 | 选择 | 理由 |
|------|------|------|
| **风格** | Dark Tech（科技暗色） | 符合监控系统专业感 |
| **差异化** | 自定义主界面 + Ant Design功能组件 | 避免"antd模板感" |
| **用户体验** | 信息密度适中，易于扫描 | 监控需要快速获取信息 |

### 三个Dials配置

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| **DESIGN_VARIANCE** | 6 | 不对称布局，但保持专业感 |
| **MOTION_INTENSITY** | 4 | 适度动画，不干扰监控 |
| **VISUAL_DENSITY** | 6 | 信息密度较高，适合监控 |

---

## 二、项目结构

### 前端Monorepo

```
~/projects/agent-monitor/
├── packages/
│   ├── shared/          # 共享工具函数（JS）
│   ├── api/             # API客户端（TS，类型约束）
│   └── types/           # 共享类型定义（TS）
├── apps/
│   ├── web/             # 主监控面板（JS + Ant Design）
│   └── admin/           # 管理后台（JS + Ant Design）
├── docs/                # 项目文档
├── pnpm-workspace.yaml
└── package.json
```

### 后端Laravel

```
~/projects/agent-api/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/   # API控制器
│   │   ├── Requests/          # 表单验证
│   │   └── Resources/         # API资源转换
│   ├── Models/                # 数据模型
│   ├── Services/              # 业务逻辑
│   └── Actions/               # 单任务操作
├── database/
│   ├── migrations/            # 数据库迁移
│   └── seeders/               # 测试数据
├── routes/
│   └── api.php                # API路由
└── config/
```

---

## 三、设计系统

### 色彩方案

```css
/* 主色调 - 青蓝色系（科技感） */
--primary-500: #06b6d4;  /* 主色 */
--primary-600: #0891b2;  /* 悬停色 */

/* 背景色 - 深灰系 */
--bg-base: #0f1117;      /* 主背景 */
--bg-surface: #1a1d24;   /* 次背景 */
--bg-card: #24272e;      /* 卡片背景 */
--bg-elevated: #2a2d35;  /* 悬浮背景 */

/* 文字色 */
--text-primary: #e5e7eb; /* 主文字 */
--text-secondary: #9ca3af; /* 次文字 */
--text-muted: #6b7280;   /* 辅助文字 */

/* 状态色 */
--success: #10b981;      /* 成功/在线 */
--warning: #f59e0b;      /* 警告 */
--error: #ef4444;        /* 错误/离线 */
```

### 设计分工策略

| 模块 | 使用方案 | 理由 |
|------|----------|------|
| **主界面布局** | 自定义CSS | 打造独特品牌感 |
| **Sidebar导航** | 自定义CSS | 科技风格侧边栏 |
| **Header** | 自定义CSS | 统一视觉风格 |
| **Dashboard卡片** | 自定义CSS | 差异化设计 |
| **表格组件** | Ant Design Table | 功能强大，排序筛选完善 |
| **表单组件** | Ant Design Form | 验证、联动逻辑完善 |
| **Modal/Drawer** | Ant Design Modal | 弹窗逻辑复杂 |
| **图表** | ECharts | 数据可视化专业 |
| **通知/消息** | Ant Design Message | 统一消息体验 |

### Tailwind CSS使用规范

| 场景 | 推荐方式 | 示例 |
|------|----------|------|
| **通用组件** | 封装CSS类 | `btn-primary`、`card` |
| **布局** | 封装CSS类 | `page-container`、`sidebar` |
| **状态** | 封装CSS类 | `loading`、`disabled` |
| **一次性调整** | Tailwind | `mt-4`、`text-center` |
| **响应式** | Tailwind | `md:grid-cols-2` |

---

## 四、数据库设计

### 核心数据表

#### 1. agents表

```sql
CREATE TABLE agents (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- online/local
    status VARCHAR(50) DEFAULT 'offline',  -- online/offline/error
    config JSONB,
    metadata JSONB,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_type_status ON agents(type, status);
CREATE INDEX idx_agents_last_active ON agents(last_active_at);
```

#### 2. execution_logs表

```sql
CREATE TABLE execution_logs (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    task_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- pending/running/success/failed
    input TEXT,
    output TEXT,
    context JSONB,
    duration INTEGER,  -- 耗时(ms)
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_agent_created ON execution_logs(agent_id, created_at);
CREATE INDEX idx_logs_task_status ON execution_logs(task_id, status);
```

#### 3. agent_metrics表（TimescaleDB）

```sql
CREATE TABLE agent_metrics (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,  -- cpu/memory/response_time
    metric_value FLOAT NOT NULL,
    tags JSONB,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_agent_name_time ON agent_metrics(agent_id, metric_name, recorded_at);
```

---

## 五、API设计

### 认证

- 使用Laravel Sanctum
- SPA认证 + API Token

### 核心接口

#### Agent相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 获取Agent列表 |
| POST | /api/agents | 创建Agent |
| GET | /api/agents/{id} | 获取Agent详情 |
| PUT | /api/agents/{id} | 更新Agent |
| DELETE | /api/agents/{id} | 删除Agent |

#### 执行日志

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/execution-logs | 获取日志列表 |
| GET | /api/execution-logs/{id} | 获取日志详情 |

#### 仪表盘

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/dashboard/stats | 获取统计数据 |
| GET | /api/dashboard/charts | 获取图表数据 |

---

## 六、实现任务清单

### Task 1: 项目初始化
- 创建Monorepo结构
- 配置pnpm workspace
- 初始化各package

### Task 2: 前端配置
- 配置Vite
- 配置Tailwind CSS
- 创建设计系统变量
- 创建组件样式

### Task 3: Laravel后端初始化
- 创建Laravel项目
- 安装Sanctum
- 配置数据库连接
- 创建API路由

### Task 4: 数据库迁移
- 创建agents表
- 创建execution_logs表
- 创建agent_metrics表

### Task 5: 前端布局实现
- 实现Sidebar
- 实现Header
- 实现Dashboard布局

### Task 6: Agent列表页面
- 实现Agent卡片组件
- 实现Agent列表
- 实现Agent详情

### Task 7: 执行日志页面
- 实现日志表格
- 实现日志详情
- 实现日志筛选

### Task 8: 仪表盘页面
- 实现统计卡片
- 实现图表组件
- 实现数据获取

---

## 七、验证标准

### 每个任务的验收条件

1. **代码可运行**：`pnpm dev` 或 `php artisan serve` 正常启动
2. **功能可用**：页面可访问，功能可操作
3. **无错误**：控制台无报错，网络请求正常
4. **符合设计**：样式符合设计规范

### 最终验收标准

1. **前端**：所有页面可正常访问，数据展示正确
2. **后端**：所有API可正常调用，返回正确数据
3. **数据库**：数据可正常读写，查询性能良好
4. **整体**：前后端联调成功，功能完整

---

## 八、注意事项

### 开发原则（Karpathy准则）

1. **编码前先思考**：明确假设，不确定就问
2. **简单优先**：用最少代码解决问题
3. **精准改动**：只动必须动的
4. **目标驱动执行**：定义可验证的成功标准

### Tailwind CSS使用规范

1. **不滥用**：避免在每个元素上堆砌大量class
2. **风格化**：通过CSS Variables统一主题
3. **规范化**：建立统一的组件样式规范
4. **封装复用**：提取通用组件和工具类

---

*本计划遵循Karpathy行为准则，每个任务都有明确的验收条件。*
