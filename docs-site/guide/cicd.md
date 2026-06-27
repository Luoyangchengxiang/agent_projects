# CI/CD 流水线

## GitHub Actions 配置

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "false"

jobs:
  lint-and-test:
    runs-on: ubuntu-22.04

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: agent_monitor_test
          POSTGRES_USER: agent_monitor
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4.2.2

      # 前端
      - uses: actions/setup-node@v4.4.0
        with:
          node-version: '20'
      - run: corepack enable
      - working-directory: apps/web
        run: pnpm install --frozen-lockfile
      - working-directory: apps/web
        run: pnpm test

      # 后端
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_pgsql
      - working-directory: agent-api
        run: composer install --no-interaction
      - working-directory: agent-api
        env:
          DB_CONNECTION: pgsql
          DB_HOST: 127.0.0.1
          DB_DATABASE: agent_monitor_test
          DB_USERNAME: agent_monitor
          DB_PASSWORD: test_password
        run: vendor/bin/phpunit
```

## 流水线流程

```
push to master
    │
    ▼
┌─────────────┐
│  前端检查    │
│  lint + test │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  后端检查    │
│  phpstan + phpunit │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  自动推送    │
│  (仅 master) │
└─────────────┘
```

## 本地测试 CI

```bash
# 使用 act 本地运行 GitHub Actions
# https://github.com/nektos/act

act -j lint-and-test
```
