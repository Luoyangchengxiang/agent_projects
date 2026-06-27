# Agent API

## 列表

```
GET /api/agents?page=1&per_page=20&status=active
Authorization: Bearer {token}
```

## 创建

```
POST /api/agents

{
  "name": "我的Agent",
  "type": "assistant",
  "description": "AI助手"
}
```

## 详情

```
GET /api/agents/{id}
```

## 更新

```
PUT /api/agents/{id}

{
  "name": "更新名称",
  "status": "inactive"
}
```

## 删除

```
DELETE /api/agents/{id}
```
