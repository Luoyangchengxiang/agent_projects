# 快速开始

## 克隆项目

```bash
git clone git@gitee.com:cheng_zhen_guo/agent-monitor.git
cd agent-monitor
```

## 后端启动

### 1. 安装依赖

```bash
cd agent-api
composer install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
APP_NAME=AgentMonitor
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=agent_monitor
DB_USERNAME=agent_monitor
DB_PASSWORD=agent_monitor_password

CACHE_STORE=file
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
```

### 3. 生成密钥

```bash
php artisan key:generate
```

### 4. 运行数据库迁移

```bash
php artisan migrate
```

### 5. 启动后端服务

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

访问 http://localhost:8000/api/test 验证。

## 前端启动

### 1. 安装依赖

```bash
cd apps/web
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看前端页面。

## 运行测试

```bash
# 前端测试
cd apps/web
pnpm test

# 后端测试
cd agent-api
vendor/bin/phpunit
```

## Docker 一键部署

```bash
# 构建并启动
docker-compose up -d

# 访问 http://localhost
```
