# 认证 API

## 登录

```
POST /api/auth/login
```

**请求体：**

```json
{
  "login": "admin@example.com",
  "password": "password123",
  "remember": true
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| login | string | 是 | 用户名或邮箱 |
| password | string | 是 | 密码 |
| remember | boolean | 否 | 是否记住登录（默认 false） |

**响应：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "token": "1|abc123...",
    "remember_token": "random_token_string",
    "is_local_login": true
  }
}
```

**说明：**
- 当 `remember=true` 时，后端会生成 `remember_token` 返回给前端
- 前端存储 `remember_token`，下次登录时可自动填充
- `remember_token` 有效期 30 天，一次性使用（每次登录后更新）

## 使用 remember_token 登录

```
POST /api/auth/login
```

**请求体：**

```json
{
  "login": "admin",
  "password": "remember_random_token_string",
  "remember": true
}
```

**说明：**
- 当密码以 `remember_` 开头时，后端会识别为 remember_token 登录
- 验证 token 有效性后直接登录，无需输入密码
- 登录成功后返回新的 `remember_token`（旧 token 失效）

## 注册

```
POST /api/auth/register
```

**请求体：**

```json
{
  "name": "新用户",
  "email": "new@example.com",
  "password": "password123"
}
```

## 获取当前用户

```
GET /api/auth/me
Authorization: Bearer ***
```

## 退出登录

```
POST /api/auth/logout
Authorization: Bearer ***
```

**说明：**
- 退出登录只清除当前 session 的 token
- 前端保留 `remember_token`，下次登录可自动填充

## 修改密码

```
PUT /api/auth/password
Authorization: Bearer ***

{
  "current_password": "old_password",
  "password": "new_password"
}
```

## 记住密码功能说明

### 前端实现

1. **存储结构**
   - 使用 localStorage 存储，key 为 `auth_remember`
   - 数据结构：
     ```json
     {
       "users": {
         "admin": {
           "rememberToken": "token_admin_123",
           "expiresAt": 1735689600000
         },
         "test": {
           "rememberToken": "token_test_456",
           "expiresAt": 1735689600000
         }
       },
       "lastLogin": "test"
     }
     ```

2. **自动填充逻辑**
   - 页面加载时，读取 `lastLogin` 用户的 `remember_token`
   - 输入用户名时，自动切换对应用户的 `remember_token`
   - 退出登录时保留 `remember_token`

3. **安全设计**
   - 前端不存储密码，只存储随机生成的 `remember_token`
   - token 一次性使用（每次登录后更新）
   - token 有效期限制（默认 30 天，可通过 `VITE_REMEMBER_DAYS` 环境变量配置）

### 后端实现

1. **数据库表**
   - `remember_tokens` 表存储用户 token
   - 字段：`id`, `user_id`, `token`, `expires_at`, `device_info`

2. **RememberToken 模型**
   - `generateForUser(userId)` - 生成新 token
   - `validateToken(userId, token)` - 验证 token
   - `clearExpiredTokens()` - 清理过期 token

3. **AuthController**
   - 识别 `remember_` 前缀的密码
   - 验证 token 有效性后直接登录
   - 登录成功后返回新的 `remember_token`
