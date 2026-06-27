# Docker 部署

## Dockerfile

```dockerfile
# 多阶段构建
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY apps/web/ ./
RUN pnpm build

FROM php:8.2-fpm-alpine
WORKDIR /var/www

# 安装 PHP 扩展
RUN apk add --no-cache postgresql-dev oniguruma-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_pgsql mbstring xml opcache

# 安装 Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 复制后端代码
COPY agent-api/ ./

# 安装依赖
RUN composer install --no-dev --optimize-autoloader --no-interaction

# 复制前端构建产物
COPY --from=frontend-build /app/dist ./public/

# 权限
RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: agent_monitor
      POSTGRES_USER: agent_monitor
      POSTGRES_PASSWORD: ${DB_PASSWORD:-agent_monitor_password}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agent_monitor"]
      interval: 10s

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      APP_ENV: production
      DB_CONNECTION: pgsql
      DB_HOST: db
      DB_DATABASE: agent_monitor
      DB_USERNAME: agent_monitor
      DB_PASSWORD: ${DB_PASSWORD:-agent_monitor_password}
    ports:
      - "8000:9000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro

volumes:
  pgdata:
```

## Nginx 配置

```nginx
server {
    listen 80;
    root /var/www/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

## 部署命令

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止
docker-compose down

# 重建
docker-compose up -d --build
```

## 环境变量

```bash
# .env (docker-compose 同级)
DB_PASSWORD=your_secure_password
APP_ENV=production
APP_DEBUG=false
```
