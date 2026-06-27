# Laravel 后端基础

## 项目结构

```
agent-api/
├── app/
│   ├── Enums/                  # 枚举 (ErrorType 等)
│   ├── Http/
│   │   ├── Controllers/Api/   # API 控制器
│   │   └── Middleware/        # 中间件
│   ├── Models/                # Eloquent 模型
│   └── Services/              # 业务服务层
├── bootstrap/app.php           # 应用配置
├── config/                     # 配置文件
├── database/migrations/        # 数据库迁移
├── routes/api.php              # API 路由
└── tests/                      # 测试
```

## 路由定义

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Agent CRUD
    Route::apiResource('agents', AgentController::class);
    
    // 告警规则
    Route::prefix('alerts')->group(function () {
        Route::get('/', [AlertController::class, 'index']);
        Route::post('/', [AlertController::class, 'store']);
        Route::get('/check', [AlertController::class, 'check']);
    });
});
```

## 控制器模式

```php
class AgentController extends Controller
{
    // 列表 (分页 + 筛选)
    public function index(Request $request): JsonResponse
    {
        $query = Agent::query();
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        $agents = $query->paginate($request->get('per_page', 20));
        
        return response()->json([
            'success' => true,
            'data' => $agents,
        ]);
    }
    
    // 创建 (带验证)
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|string|max:50',
        ]);
        
        $agent = Agent::create($validated);
        
        return response()->json([
            'success' => true,
            'data' => $agent,
        ], 201);
    }
}
```

## 模型定义

```php
class Agent extends Model
{
    protected $fillable = ['name', 'type', 'status', 'description'];
    
    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
    ];
    
    // 关联
    public function metrics(): HasMany
    {
        return $this->hasMany(AgentMetric::class);
    }
    
    // Scope
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
```

## 中间件

### 限流中间件

```php
class ApiRateLimit
{
    public function handle(Request $request, Closure $next): Response
    {
        // GET 不限流
        if ($request->isMethodCacheable()) {
            return $next($request);
        }
        
        // POST 限流: 60次/10秒
        $key = "rate_limit:default:{$request->ip()}";
        $count = (int) Cache::get($key, 0);
        
        if ($count >= 60) {
            return response()->json([
                'message' => '请求过于频繁',
            ], 429);
        }
        
        Cache::put($key, $count + 1, now()->addSeconds(10));
        
        return $next($request);
    }
}
```

### 注册中间件

```php
// bootstrap/app.php
$middleware->api(prepend: [
    ApiRateLimit::class,
    IpDetection::class,
]);
```

## 认证 (Sanctum)

```php
// 登录
public function login(Request $request): JsonResponse
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);
    
    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json([
            'success' => false,
            'message' => '用户名或密码错误',
        ], 401);
    }
    
    $user = Auth::user();
    $token = $user->createToken('auth-token')->plainTextToken;
    
    return response()->json([
        'success' => true,
        'data' => ['user' => $user, 'token' => $token],
    ]);
}
```
