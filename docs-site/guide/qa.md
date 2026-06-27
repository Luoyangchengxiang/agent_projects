# 常见问题 QA

## 环境问题

### Q: pnpm install 报错网络超时

```bash
# 开启代理
proxy

# 或使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com
```

### Q: php artisan serve 启动后访问 502

检查代理是否干扰 localhost：

```bash
# 关闭代理
unproxy

# 或排除 localhost
export no_proxy=localhost,127.0.0.1
```

### Q: PostgreSQL 连接失败 "FATAL: password authentication failed"

```bash
# 检查 pg_hba.conf 认证方式
sudo nano /etc/postgresql/16/main/pg_hba.conf

# 将 peer/scram-sha-256 改为 md5
sudo systemctl restart postgresql
```

### Q: PHP 缺少扩展

```bash
# 安装必要扩展
sudo apt install php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl
sudo systemctl restart php8.2-fpm
```

## 前端问题

### Q: Vite 启动白屏

检查 vite.config.js 的 proxy 配置是否正确：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

### Q: npm test 报错 "Cannot find module"

```bash
# 重新安装依赖
rm -rf node_modules
pnpm install
```

### Q: 页面切换后数据不显示

检查 API 响应拦截器是否正确解包 data：

```javascript
// 错误: 多取了一层
const data = res.data.data

// 正确: 拦截器已解包
const data = res.data
```

## 后端问题

### Q: php artisan migrate 报错 "database does not exist"

```bash
# 创建数据库
PGPASSWORD="agent_monitor_password" psql -U agent_monitor -h 127.0.0.1 -c "CREATE DATABASE agent_monitor;"
```

### Q: 接口返回 429 "请求过于频繁"

GET 请求不应触发限流。检查 ApiRateLimit 中间件是否正确跳过 GET：

```php
if ($request->isMethodCacheable()) {
    return $next($request);
}
```

### Q: phpunit 报错 "could not find driver"

安装 SQLite 扩展或使用 PostgreSQL：

```bash
# 方案1: 安装 SQLite
sudo apt install php8.2-sqlite3

# 方案2: 使用 PostgreSQL (修改 phpunit.xml)
```

## 部署问题

### Q: Docker 构建失败

```bash
# 清理缓存重建
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### Q: CI 流水线 Node.js 20 报错

在 ci.yml 中添加环境变量：

```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "false"
```

## 数据问题

### Q: 时间显示错误 (差8小时)

后端存储时间时使用 UTC：

```php
// 错误: 时区被丢弃
'created_at' => '2026-06-27 09:00+08:00'  // 存为 09:00 UTC

// 正确: 使用 UTC
'created_at' => '2026-06-27 01:00:00'  // 09:00 CST = 01:00 UTC
```

### Q: 版本更新通知不显示

检查响应拦截器返回格式：

```javascript
// 拦截器已解包 response.data
// 所以直接访问 res.data 而非 res.data.data
```
