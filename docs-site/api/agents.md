# Agent API

## 列表（支持树状结构）

```
GET /api/agents?tree=true&status=active
Authorization: Bearer {token}
```

### 普通列表

```
GET /api/agents?page=1&per_page=20
```

### 树状列表

```
GET /api/agents?tree=true
```

返回：
```json
{
  "success": true,
  "data": [
    {
      "id": 37,
      "name": "开店团队",
      "type": "team",
      "is_group": true,
      "children": [
        {
          "id": 38,
          "name": "决策引擎",
          "type": "local",
          "parent_id": 37,
          "executor_type": "ollama",
          "model": "qwen2.5:3b"
        }
      ]
    }
  ]
}
```

## 创建

```
POST /api/agents
Authorization: Bearer {token}

{
  "name": "我的Agent",
  "type": "local",
  "model": "qwen2.5:3b",
  "system_prompt": "你是一个AI助手",
  "parent_id": 37
}
```

**自动触发：** 创建成功后自动同步知识图谱（Observer）

## 详情

```
GET /api/agents/{id}
```

## 更新

```
PUT /api/agents/{id}

{
  "name": "更新名称",
  "status": "online",
  "system_prompt": "新的提示词"
}
```

**自动触发：** 更新后自动同步图谱节点，修改 `system_prompt` 会刷新技能节点

## 删除（软删除）

```
DELETE /api/agents/{id}
```

- 管理员可删除任何 Agent
- 普通用户只能删除自己创建的 Agent
- 组删除时，子 Agent 也一并软删除
- **自动触发：** 删除后自动清理图谱节点和孤立技能

## 恢复

```
POST /api/agents/{id}/restore
Authorization: Bearer {token} (admin)
```

## 回收站

```
GET /api/agents/trash
Authorization: Bearer {token} (admin)
```

## Modelfile 同步

### 本地 → 数据库

```
POST /api/agents-sync/from-local
Authorization: Bearer {token} (admin)
```

扫描本地 `~/local-ai/agents/` 目录，自动创建/更新数据库中的 Agent。

### 数据库 → 本地

```
POST /api/agents-sync/to-local
Authorization: Bearer {token} (admin)
```

将数据库中的 Agent 信息写回本地 Modelfile。

### 查看 Modelfile

```
GET /api/agents/{id}/modelfile
```

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | Agent 名称 |
| `type` | string | 类型：`local`（独立）/ `team`（团队） |
| `status` | string | 状态：`online` / `offline` / `error` |
| `model` | string | 使用的模型（如 `qwen2.5:3b`） |
| `executor_type` | string | 执行器类型（如 `ollama`） |
| `system_prompt` | text | 系统提示词 |
| `parent_id` | int | 父级 Agent ID（团队成员） |
| `is_deleted` | bool | 是否已删除（软删除） |
| `created_by` | int | 创建者用户 ID |

## 权限

| 操作 | admin | support | user |
|------|-------|---------|------|
| 查看列表 | ✅ | ✅ | ✅ |
| 创建 | ✅ | ✅ | ✅ |
| 编辑 | 所有 | 所有 | 自己的 |
| 删除 | 所有 | 所有 | 自己的 |
| 恢复 | ✅ | ❌ | ❌ |
| 回收站 | ✅ | ✅ | ❌ |
| Modelfile 同步 | ✅ | ❌ | ❌ |
