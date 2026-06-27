# API 概览

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: Bearer Token (Sanctum)
- **响应格式**: JSON

## 通用响应结构

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "error_type": "error_code"
}
```

## 限流策略

| 请求类型 | 限制 |
|---------|------|
| GET/HEAD/OPTIONS | 不限流 |
| POST/PUT/DELETE/PATCH | 60次/10秒 |
| 登录 | 20次/分钟 |
| 注册 | 5次/分钟 |

## 模块列表

| 模块 | 端点数 | 说明 |
|------|--------|------|
| Auth | 5 | 认证 |
| Agents | 5 | Agent 管理 |
| Dashboard | 4 | 仪表盘 |
| ErrorLogs | 6 | 错误日志 |
| Alerts | 7 | 告警规则 |
| Metrics | 8 | 性能指标 |
| ExecutionLogs | 2 | 执行日志 |
| Reports | 6 | 数据报告 |
| Graph | 7 | 知识图谱 |
| CronJobs | 8 | 定时任务 |
| Chat | 7 | 客服系统 |
| Permissions | 4 | 权限管理 |
| VersionUpdates | 5 | 版本更新 |

**总计：74 个端点**
