FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY apps/web/ ./
RUN pnpm build

FROM php:8.2-fpm-alpine
WORKDIR /var/www

# 安装 PHP 扩展
RUN apk add --no-cache \
    postgresql-dev \
    oniguruma-dev \
    libxml2-dev \
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
