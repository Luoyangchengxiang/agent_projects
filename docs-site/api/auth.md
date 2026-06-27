# 认证 API

## 登录

```
POST /api/auth/login
```

**请求体：**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Admin",
      "email": "admin@example.com"
    },
    "token": "1|abc123...",
    "is_local_login": true
  }
}
```

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
Authorization: Bearer {token}
```

## 退出登录

```
POST /api/auth/logout
Authorization: Bearer {token}
```

## 修改密码

```
PUT /api/auth/password
Authorization: Bearer {token}

{
  "current_password": "old_password",
  "password": "new_password"
}
```
