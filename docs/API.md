# Agent Monitor API 文档

## 概览

Agent 监控系统提供 RESTful API，支持以下功能模块：

| 模块 | 端点数 | 说明 |
|------|--------|------|
| Auth | 5 | 认证（登录/注册/退出/修改密码） |
| Agents | 5 | Agent 管理 CRUD |
| Dashboard | 4 | 仪表盘统计 |
| ErrorLogs | 6 | 错误日志管理 |
| Alerts | 7 | 告警规则管理 |
| Metrics | 8 | 性能指标监控 |
| ExecutionLogs | 2 | 执行日志查看 |
| Reports | 6 | 数据报告生成 |
| Graph | 7 | 知识图谱管理 |
| CronJobs | 8 | 定时任务管理 |
| Chat | 7 | 客服系统 |
| Permissions | 4 | 权限管理 |
| VersionUpdates | 5 | 版本更新管理 |

**总计：74 个 API 端点**

## 快速开始

### 1. 获取 Token

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 2. 使用 Token

```bash
curl http://localhost:8000/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 限流策略

| 请求类型 | 限制 |
|---------|------|
| GET/HEAD/OPTIONS | 不限流 |
| POST/PUT/DELETE/PATCH | 60次/10秒 |
| 登录 | 20次/分钟 |
| 注册 | 5次/分钟 |

触发限流返回 `429 Too Many Requests`。

## 错误响应格式

```json
{
  "success": false,
  "message": "错误信息",
  "error_type": "error_code"
}
```

## Swagger UI

本地查看完整 API 文档：

```bash
# 安装 swagger-ui-dist
npm install -g swagger-ui-dist

# 启动文档服务
npx swagger-ui-serve docs/openapi.yaml
# 访问 http://localhost:3001
```

或使用在线编辑器：
- 访问 https://editor.swagger.io
- 粘贴 `docs/openapi.yaml` 内容

## 文件位置

- OpenAPI 规范: `docs/openapi.yaml`
- 本文档: `docs/API.md`
