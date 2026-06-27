# 公网穿透

## 方案选择

| 方案 | 优点 | 缺点 |
|------|------|------|
| natapp | 免费、稳定 | 需注册 |
| ngrok | 知名 | 免费版有限制 |
| localtunnel | 无需注册 | 不够稳定 |
| Cloudflare Tunnel | 免费、安全 | 配置复杂 |

## natapp 配置 (推荐)

### 1. 注册并获取 authtoken

访问 https://natapp.cn 注册账号，获取 authtoken。

### 2. 安装 natapp

```bash
# 下载
wget https://github.com/natapp-cn/natapp_64/blob/master/natapp?raw=true -O natapp
chmod +x natapp
sudo mv natapp /usr/local/bin/
```

### 3. 配置

```bash
natapp -authtoken=你的authtoken
```

### 4. 启动

```bash
# 穿透本地 80 端口
natapp -authtoken=你的authtoken

# 穿透指定端口
natapp -authtoken=你的authtoken -port=8000
```

## 注意事项

::: warning 代理冲突
启动穿透前确保关闭代理，否则 localhost 请求会被代理拦截。
:::

::: warning 进程管理
穿透进程退出后需重新启动，建议使用 screen 或 tmux 保持会话。
:::

```bash
# 使用 screen 保持会话
screen -S tunnel
natapp -authtoken=你的authtoken
# Ctrl+A+D 分离会话
```
