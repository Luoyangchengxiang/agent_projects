# API 开发

## 路由定义

所有 API 路由定义在 `routes/api.php`，共 74 个端点。

### 路由结构

```php
// routes/api.php

// 公开路由（无需认证）
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// 需要认证的路由
Route::middleware('auth:sanctum')->group(function () {
    // 认证
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Agent CRUD
    Route::apiResource('agents', AgentController::class);

    // 仪表盘
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // ...更多路由
});
```

## 控制器开发

### 标准 CRUD 控制器

```php
<?php
// app/Http/Controllers/Api/AgentController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    // 列表
    public function index(Request $request)
    {
        $query = Agent::query();

        // 搜索
        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        // 排序
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // 分页
        $perPage = $request->input('per_page', 20);
        $agents = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $agents,
        ]);
    }

    // 创建
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'config' => 'nullable|array',
        ]);

        $agent = Agent::create($validated);

        return response()->json([
            'success' => true,
            'data' => $agent,
        ], 201);
    }

    // 详情
    public function show(Agent $agent)
    {
        return response()->json([
            'success' => true,
            'data' => $agent,
        ]);
    }

    // 更新
    public function update(Request $request, Agent $agent)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string',
            'status' => 'sometimes|string',
        ]);

        $agent->update($validated);

        return response()->json([
            'success' => true,
            'data' => $agent,
        ]);
    }

    // 删除
    public function destroy(Agent $agent)
    {
        $agent->delete();

        return response()->json([
            'success' => true,
            'message' => '删除成功',
        ]);
    }
}
```

### 统一响应格式

```php
// 成功
return response()->json([
    'success' => true,
    'data' => $data,
    'message' => '操作成功',
], 200);

// 失败
return response()->json([
    'success' => false,
    'message' => '错误信息',
    'errors' => $errors,
], 422);
```

## 模型开发

```php
<?php
// app/Models/Agent.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    protected $fillable = [
        'name',
        'type',
        'description',
        'status',
        'config',
    ];

    protected $casts = [
        'config' => 'array',  // JSON 自动转数组
    ];

    // 关联
    public function errorLogs()
    {
        return $this->hasMany(ErrorLog::class);
    }

    public function executionLogs()
    {
        return $this->hasMany(ExecutionLog::class);
    }
}
```

## 请求验证

```php
// 在控制器中验证
$validated = $request->validate([
    'name' => 'required|string|max:255',
    'email' => 'required|email|unique:users',
    'password' => 'required|min:8',
]);

// 自定义错误消息
$validated = $request->validate([
    'name' => 'required',
], [
    'name.required' => '名称不能为空',
]);
```

## 分页

```php
// 基本分页
$items = Model::paginate(20);

// 自定义分页
$items = Model::where('status', 'active')
    ->orderBy('created_at', 'desc')
    ->paginate($request->input('per_page', 20));

return response()->json([
    'success' => true,
    'data' => $items,
    // paginate 自带 meta: current_page, last_page, per_page, total
]);
```

## 错误处理

```php
// 404
if (!$agent) {
    return response()->json([
        'success' => false,
        'message' => 'Agent 不存在',
    ], 404);
}

// 422 验证失败
try {
    $validated = $request->validate([...]);
} catch (ValidationException $e) {
    return response()->json([
        'success' => false,
        'message' => '验证失败',
        'errors' => $e->errors(),
    ], 422);
}

// 500 服务器错误
try {
    // 业务逻辑
} catch (\Exception $e) {
    return response()->json([
        'success' => false,
        'message' => '服务器内部错误',
    ], 500);
}
```

## Sanctum 认证

```php
// 登录
public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    $user = User::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'success' => false,
            'message' => '邮箱或密码错误',
        ], 401);
    }

    $token = $user->createToken('auth-token')->plainTextToken;

    return response()->json([
        'success' => true,
        'data' => [
            'user' => $user,
            'token' => $token,
        ],
    ]);
}

// 注销
public function logout(Request $request)
{
    $request->user()->currentAccessToken()->delete();

    return response()->json([
        'success' => true,
        'message' => '已注销',
    ]);
}
```
