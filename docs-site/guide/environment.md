# 环境搭建

## 系统要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | 22+ | 前端运行环境 (LTS) |
| pnpm | 8+ | 包管理器 |
| PHP | 8.2+ | 后端运行环境 |
| Composer | 2+ | PHP 包管理器 |
| PostgreSQL | 16 | 数据库 |
| Git | 2+ | 版本控制 |

## WSL2 环境 (推荐)

### 1. 安装 WSL2

```bash
# Windows PowerShell (管理员)
wsl --install -d Ubuntu-24.04
```

### 2. 安装 Node.js

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 安装 Node.js 22 (LTS)
nvm install 22
nvm use 22

# 验证
node -v  # v22.x.x
npm -v
```

### 3. 安装 pnpm

```bash
corepack enable
pnpm -v
```

### 4. 安装 PHP 8.2

```bash
sudo apt update
sudo apt install -y php8.2 php8.2-cli php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip

php -v  # PHP 8.2.x
```

### 5. 安装 Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer -V
```

### 6. 安装 PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 7. 配置 PostgreSQL

```bash
# 创建用户和数据库
sudo -u postgres psql
```

```sql
CREATE USER agent_monitor WITH PASSWORD 'agent_monitor_password';
CREATE DATABASE agent_monitor OWNER agent_monitor;
GRANT ALL PRIVILEGES ON DATABASE agent_monitor TO agent_monitor;
\q
```

```bash
# 修改认证方式 (允许密码登录)
sudo nano /etc/postgresql/16/main/pg_hba.conf

# 将以下行的 peer/scram-sha-256 改为 md5:
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

sudo systemctl restart postgresql
```

### 8. 验证连接

```bash
PGPASSWORD="agent_monitor_password" psql -U agent_monitor -h 127.0.0.1 -d agent_monitor -c "SELECT 1;"
```

## 网络代理 (可选)

如果在国内环境，配置代理加速依赖下载：

```bash
# bashrc 中添加代理函数
proxy() {
  export http_proxy=http://127.0.0.1:7890
  export https_proxy=http://127.0.0.1:7890
  echo "代理已开启"
}

unproxy() {
  unset http_proxy https_proxy
  echo "代理已关闭"
}
```

::: tip 注意
安装依赖时开启代理，运行项目时关闭代理，避免 localhost 被代理拦截。
:::
