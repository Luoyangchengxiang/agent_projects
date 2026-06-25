# Docker 部署

使用 Docker Compose 可以快速部署系统，无需手动安装复杂的环境依赖。

## 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

## 快速启动

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd agent-monitor
   ```

2. **配置环境变量**
   编辑 `docker-compose.yml`，修改数据库密码和 Ollama 地址（可选）。

3. **构建并启动**
   ```bash
   docker-compose up -d --build
   ```

4. **初始化数据库**
   ```bash
   # 进入后端容器
   docker exec -it agent-api bash
   
   # 运行迁移与数据填充
   php artisan migrate --force
   php artisan db:seed --force
   ```

5. **访问系统**
   - 前端: http://localhost:3000
   - API: http://localhost:8000/api

## 常见问题

### Ollama 连接失败
请确保 `OLLAMA_BASE_URL` 设置正确。如果 Ollama 运行在宿主机上，使用 `http://host.docker.internal:11434`。
