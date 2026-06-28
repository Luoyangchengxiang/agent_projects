<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\RememberToken;
use App\Services\CaptchaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * 本地IP白名单 — 这些IP可以直接用 admin/123456 登录
     */
    private const LOCAL_IPS = [
        '127.0.0.1',
        '::1',
        'localhost',
    ];

    public function __construct(
        private CaptchaService $captchaService
    ) {}

    /**
     * 检测是否为本地IP
     */
    private function isLocalIp(string $ip): bool
    {
        return in_array($ip, self::LOCAL_IPS)
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || $this->isPrivateIp172($ip);
    }

    /**
     * 检测是否为 172.16.0.0/12 私有地址段
     */
    private function isPrivateIp172(string $ip): bool
    {
        if (!str_starts_with($ip, '172.')) {
            return false;
        }
        $parts = explode('.', $ip);
        if (count($parts) < 2) {
            return false;
        }
        $second = (int) $parts[1];
        return $second >= 16 && $second <= 31;
    }

    /**
     * 检查密码是否是 remember_token
     */
    private function isRememberToken(string $password): bool
    {
        return str_starts_with($password, RememberToken::TOKEN_PREFIX);
    }

    /**
     * 通过 remember_token 查找用户
     */
    private function findUserByRememberToken(string $token): ?User
    {
        $rememberToken = RememberToken::findByToken($token);
        if (!$rememberToken) {
            return null;
        }
        return $rememberToken->user;
    }

    /**
     * 生成登录响应
     */
    private function loginResponse(User $user, bool $remember, string $clientIp, bool $isLocalLogin = false): JsonResponse
    {
        // 创建 Sanctum token（用于 API 认证）
        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        // 生成 remember_token（如果需要）
        $rememberToken = null;
        if ($remember) {
            $deviceInfo = request()->header('User-Agent');
            $rememberToken = RememberToken::createForUser($user, $deviceInfo, $clientIp);
        }

        // 更新最后登录信息
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $clientIp,
        ]);

        return response()->json([
            'success' => true,
            'message' => $isLocalLogin ? '本地IP快捷登录成功' : '登录成功',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'nickname' => $user->nickname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'mascot_model_id' => $user->mascot_model_id,
                ],
                'token' => $token,
                'remember_token' => $rememberToken,
                'is_local_login' => $isLocalLogin,
            ],
        ]);
    }

    /**
     * POST /api/auth/login
     * 用户登录（支持用户名或邮箱 + 密码 或 remember_token）
     *
     * 特殊逻辑：
     * - 本地IP可以使用 admin/123456 直接登录
     * - 支持 remember_token 登录（密码字段传 remember_token）
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
            'password' => 'required|string',
            'remember' => 'nullable|boolean',
        ], [
            'login.required' => '请输入用户名或邮箱',
            'password.required' => '请输入密码',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $login = $request->input('login');
        $password = $request->input('password');
        $remember = $request->boolean('remember', false);
        $clientIp = $request->ip();

        // 检查是否是 remember_token 登录
        if ($this->isRememberToken($password)) {
            $user = $this->findUserByRememberToken($password);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => '记住登录已过期，请重新输入密码',
                ], 401);
            }

            // 检查账号是否被禁用
            if ($user->status === 'disabled') {
                return response()->json([
                    'success' => false,
                    'message' => '账号已被禁用，请联系管理员',
                ], 403);
            }

            // 删除旧的 remember_token（一次性使用）
            $rememberToken = RememberToken::findByToken($password);
            if ($rememberToken) {
                $rememberToken->delete();
            }

            return $this->loginResponse($user, true, $clientIp, false);
        }

        // 本地IP快捷登录：admin/123456
        if ($this->isLocalIp($clientIp) && $login === 'admin' && $password === '123456') {
            $admin = User::where('email', 'admin@local')->first();
            if (!$admin) {
                // 自动创建管理员
                $admin = User::create([
                    'name' => 'admin',
                    'nickname' => '管理员',
                    'email' => 'admin@local',
                    'password' => Hash::make('123456'),
                    'role' => 'admin',
                ]);
            }

            return $this->loginResponse($admin, $remember, $clientIp, true);
        }

        // 判断是邮箱还是用户名登录
        $isEmail = filter_var($login, FILTER_VALIDATE_EMAIL);

        if ($isEmail) {
            // 邮箱登录
            if (str_ends_with($login, '@test.local')) {
                // 测试邮箱：按用户名（@前面部分）查找最新账号
                $username = strstr($login, '@', true);
                $user = User::where('name', $username)->orderByDesc('id')->first();
            } else {
                $user = User::where('email', $login)->first();
            }
        } else {
            // 用户名登录
            $user = User::where('name', $login)->first();
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => '账号不存在',
            ], 401);
        }

        if (!Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => '密码错误',
            ], 401);
        }

        // 检查账号是否被禁用
        if ($user->status === 'disabled') {
            return response()->json([
                'success' => false,
                'message' => '账号已被禁用，请联系管理员',
            ], 403);
        }

        return $this->loginResponse($user, $remember, $clientIp, false);
    }

    /**
     * POST /api/auth/register
     * 用户注册（需要验证码）
     */
    public function register(Request $request): JsonResponse
    {
        // 测试邮箱处理：@test.local 域名自动加时间戳后缀
        $email = $request->input('email', '');
        $isTestEmail = str_ends_with($email, '@test.local');

        // 验证规则
        $emailRule = $isTestEmail ? 'required|email' : 'required|email|unique:users,email';

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50|unique:users,name',
            'email' => $emailRule,
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'captcha_code' => 'required|string|size:4',
            'captcha_token' => 'required|string|size:32',
        ], [
            'name.required' => '请输入用户名',
            'name.unique' => '该用户名已被使用',
            'name.max' => '用户名不能超过50个字符',
            'email.required' => '请输入邮箱',
            'email.email' => '邮箱格式不正确',
            'email.unique' => '该邮箱已被注册',
            'password.required' => '请输入密码',
            'password.min' => '密码至少需要8个字符',
            'password.confirmed' => '两次输入的密码不一致',
            'captcha_code.required' => '请输入验证码',
            'captcha_code.size' => '验证码格式不正确',
            'captcha_token.required' => '验证码token缺失',
            'captcha_token.size' => '验证码token格式不正确',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        // 验证验证码
        $captchaCode = $request->input('captcha_code');
        $captchaToken = $request->input('captcha_token');

        if (!$this->captchaService->verify($captchaToken, $captchaCode)) {
            return response()->json([
                'success' => false,
                'message' => '验证码错误或已过期',
                'error_type' => 'captcha_invalid',
            ], 422);
        }

        // 测试邮箱：生成唯一邮箱存储
        $storeEmail = $isTestEmail
            ? preg_replace('/@/', '_' . time() . '_', $email, 1)
            : $email;

        // 自动生成随机昵称
        $adjectives = ['快乐的', '勇敢的', '聪明的', '可爱的', '神秘的', '优雅的', '活泼的', '冷静的', '热情的', '幸运的'];
        $animals = ['小猫', '小狗', '兔子', '熊猫', '狐狸', '海豚', '蝴蝶', '松鼠', '企鹅', '考拉'];
        $randomNickname = $adjectives[array_rand($adjectives)] . $animals[array_rand($animals)] . rand(100, 999);

        $user = User::create([
            'name' => $request->input('name'),
            'nickname' => $randomNickname,
            'email' => $storeEmail,
            'password' => Hash::make($request->input('password')),
            'role' => 'user',
            'status' => 'active',
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => '注册成功',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'nickname' => $user->nickname,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'token' => $token,
            ],
        ], 201);
    }

    /**
     * GET /api/auth/me
     * 获取当前用户信息
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'nickname' => $user->nickname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'mascot_model_id' => $user->mascot_model_id,
                    'status' => $user->status,
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'created_at' => $user->created_at,
                ],
            ],
        ]);
    }

    /**
     * PUT /api/auth/mascot
     * 更新看板娘形象
     */
    public function updateMascot(Request $request): JsonResponse
    {
        $request->validate([
            'mascot_model_id' => 'required|string|max:50',
        ]);

        $user = $request->user();
        $user->update([
            'mascot_model_id' => $request->mascot_model_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => '看板娘形象已更新',
            'data' => [
                'mascot_model_id' => $user->mascot_model_id,
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     * 退出登录（撤销当前Token）
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => '已退出登录',
        ]);
    }

    /**
     * PUT /api/auth/nickname
     * 修改昵称
     */
    public function updateNickname(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nickname' => 'required|string|max:50',
        ], [
            'nickname.required' => '请输入昵称',
            'nickname.max' => '昵称不能超过50个字符',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $user->update([
            'nickname' => $request->input('nickname'),
        ]);

        return response()->json([
            'success' => true,
            'message' => '昵称修改成功',
            'data' => [
                'nickname' => $user->nickname,
            ],
        ]);
    }

    /**
     * PUT /api/auth/password
     * 修改密码
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => '当前密码错误',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->input('password')),
        ]);

        // 撤销其他Token，只保留当前
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        // 撤销所有 remember_token
        RememberToken::where('user_id', $user->id)->delete();

        return response()->json([
            'success' => true,
            'message' => '密码修改成功，其他设备已自动退出',
        ]);
    }
}
