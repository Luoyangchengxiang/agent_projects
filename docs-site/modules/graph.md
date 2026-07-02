# 知识图谱模块

## 概述

知识图谱模块提供 Agent、技能、团队之间的关系可视化，支持 ECharts 和 G6 两种渲染引擎。

**核心特性：Agent 变动自动同步图谱，无需手动维护。**

## 自动同步机制

### Model Observer（实时同步）

Agent 的增删改操作会自动同步到知识图谱：

```
Agent 创建 → 图谱节点 + 技能节点 + 协作边
Agent 更新 → 节点信息更新 + 技能刷新
Agent 软删除 → 图谱节点清理 + 孤立技能清理  ← v0.4.1 修复
Agent 恢复   → 图谱节点重建 + 技能重建      ← v0.4.1 新增
Agent 硬删除 → 图谱节点清理 + 孤立技能清理
parent_id 变动 → 父子关系重建 + 协作边重建
```

> ⚠️ **注意**：软删除通过 `is_deleted=true → save()` 实现，触发的是 `updated` 事件而非 `deleted` 事件。恢复同理。

**实现文件：** `app/Observers/AgentGraphObserver.php`

**关键方法：**
| 方法 | 触发时机 | 行为 |
|------|----------|------|
| `created()` | Agent 新建 / 恢复 | 创建图谱节点 + 技能 + 协作边 |
| `updated()` | Agent 更新 / 软删除 / 恢复 | 检测 `is_deleted` 变化，软删→清理，恢复→重建 |
| `deleted()` | 硬删除 | 委托 `removeGraphNodes()` |
| `removeGraphNodes()` | 软/硬删除共用 | ①查技能边→②删边→③清孤立技能→④删节点 |

**注册位置：** `app/Providers/AppServiceProvider.php` → `boot()` 方法

### 手动全量同步

当数据异常或需要重建时，使用命令行：

```bash
# 增量同步（已有节点跳过）
php artisan graph:sync

# 清空重建
php artisan graph:sync --clear
```

**同步逻辑：**
1. 扫描所有 Agent（`active` + `with('children')`）
2. 有子级的 Agent → `agent_group` 节点
3. 子 Agent → `agent` 节点 + `contains` 边
4. 从 `system_prompt` 提取技能关键词 → `skill` 节点 + `uses` 边
5. 同组 Agent 之间 → `collaborates` 边

## 数据库设计

```sql
-- 图节点
CREATE TABLE graph_nodes (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,        -- agent_group/agent/skill/knowledge/output
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,                    -- { model, executor_type }
    agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 图边（关系）
CREATE TABLE graph_edges (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_id BIGINT REFERENCES graph_nodes(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL, -- contains/uses/produces/depends_on/collaborates
    label VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 节点类型

| 类型 | 说明 | 图标 | 颜色 |
|------|------|------|------|
| `agent_group` | 智能体团队 | 🤖 | #6366f1 |
| `agent` | 智能体 | ⚡ | #06b6d4 |
| `skill` | 技能 | 🎯 | #f59e0b |
| `knowledge` | 知识库 | 📚 | #8b5cf6 |
| `output` | 产出物 | 📊 | #10b981 |

## 关系类型

| 类型 | 说明 | 颜色 |
|------|------|------|
| `contains` | 团队包含成员 | #6366f1 |
| `uses` | 使用技能 | #06b6d4 |
| `collaborates` | 协作关系 | #ec4899 |
| `produces` | 产出 | #10b981 |
| `depends_on` | 依赖 | #f59e0b |

## 后端 API

```php
// routes/api.php
Route::prefix('graph')->group(function () {
    Route::get('/', [GraphController::class, 'index']);           // 获取全图
    Route::get('/search', [GraphController::class, 'search']);    // 搜索节点
    Route::post('/nodes', [GraphController::class, 'store']);     // 创建节点
    Route::get('/nodes/{node}', [GraphController::class, 'show']);
    Route::put('/nodes/{node}', [GraphController::class, 'update']);
    Route::delete('/nodes/{node}', [GraphController::class, 'destroy']);
    Route::get('/nodes/{node}/neighbors', [GraphController::class, 'neighbors']);
    Route::post('/edges', [GraphController::class, 'storeEdge']); // 创建边
    Route::delete('/edges/{edge}', [GraphController::class, 'destroyEdge']);
});
```

### index — 获取全图数据

```
GET /api/graph?type=agent&search=选品
Authorization: Bearer {token}
```

返回：
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": 1,
        "type": "agent_group",
        "name": "开店团队",
        "description": "...",
        "agent_id": 37,
        "agent": { "status": "offline", "model": "qwen2.5:3b" }
      }
    ],
    "edges": [
      {
        "source_id": 1,
        "target_id": 2,
        "relation_type": "contains",
        "label": "包含"
      }
    ]
  }
}
```

## 前端实现

### 双引擎切换

- **ECharts**：适合中小规模图谱，交互流畅
- **G6**：适合大规模图谱，支持更复杂的布局算法

### 节点状态

节点运行状态从关联 Agent 的真实状态获取：

```javascript
export const getNodeStatus = (node) => {
  if (node.agent?.status === 'online') return 'running'
  if (node.agent?.status === 'error') return 'error'
  return 'idle'
}
```

### 悬浮框（Tooltip）

- 描述文字截断到 80 字符，超出显示 `...`
- 最大宽度 280px，防止溢出
- 名称超长时 `text-overflow: ellipsis`
- 支持三种状态：运行中（绿）、异常（红）、空闲（灰）

## 数据导入

### 执行日志和报告

从本地报告文件批量导入：

```bash
# 导入全部
php artisan data:import --all

# 仅导入执行日志
php artisan data:import --logs

# 仅导入报告
php artisan data:import --reports
```

**导入来源：** `~/local-ai/agents/开店团队/报告/` 目录下的 `.md` 文件

## 相关文件

| 文件 | 说明 |
|------|------|
| `app/Observers/AgentGraphObserver.php` | Agent 变动自动同步图谱 |
| `app/Console/Commands/SyncKnowledgeGraph.php` | 手动全量同步命令 |
| `app/Console/Commands/ImportLocalData.php` | 本地数据导入命令 |
| `app/Http/Controllers/GraphController.php` | 图谱 API 控制器 |
| `app/Models/GraphNode.php` | 图节点模型 |
| `app/Models/GraphEdge.php` | 图边模型 |
| `apps/web/src/pages/KnowledgeGraph.jsx` | 图谱页面 |
| `apps/web/src/components/G6Graph.jsx` | G6 渲染组件 |
| `apps/web/src/constants/graphConstants.js` | 节点/边类型常量 |
