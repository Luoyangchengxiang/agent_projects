<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
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

    /**
     * 检测是否为本地IP
     */
    private function isLocalIp(string $ip): bool
    {
        return in_array($ip, self::LOCAL_IPS)
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || str_starts_with($ip, '172.');
    }

    /**
     * POST /api/auth/login
     * 用户登录
     *
     * 特殊逻辑：本地IP可以使用 admin/123456 直接登录
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');
        $password = $request->input('password');
        $clientIp = $request->ip();

        // 本地IP快捷登录：admin/123456
        if ($this->isLocalIp($clientIp) && $email === 'admin' && $password === '123456') {
            $admin = User::where('email', 'admin@local')->first();
            if (!$admin) {
                // 自动创建管理员
                $admin = User::create([
                    'name' => '管理员',
                    'email' => 'admin@local',
                    'password' => Hash::make('123456'),
                    'role' => 'admin',
                ]);
            }

            $token = $admin->createToken('auth-token', ['*'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => '本地IP快捷登录成功',
                'data' => [
                    'user' => [
                        'id' => $admin->id,
                        'name' => $admin->name,
                        'email' => $admin->email,
                        'role' => $admin->role,
                    ],
                    'token' => $token,
                    'is_local_login' => true,
                ],
            ]);
        }

        // 常规邮箱密码登录
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => '邮箱或密码错误',
            ], 401);
        }

        // 检查账号是否被禁用
        if ($user->status === 'disabled') {
            return response()->json([
                'success' => false,
                'message' => '账号已被禁用，请联系管理员',
            ], 403);
        }

        $token = $user->createToken('auth-token', ['*'])->plainTextToken;

        // 更新最后登录信息
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $clientIp,
        ]);

        return response()->json([
            'success' => true,
            'message' => '登录成功',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'token' => $token,
                'is_local_login' => false,
            ],
        ]);
    }

    /**
     * POST /api/auth/register
     * 用户注册
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:50',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => '请输入用户名',
            'name.max' => '用户名不能超过50个字符',
            'email.required' => '请输入邮箱',
            'email.email' => '邮箱格式不正确',
            'email.unique' => '该邮箱已被注册',
            'password.required' => '请输入密码',
            'password.min' => '密码至少需要8个字符',
            'password.confirmed' => '两次输入的密码不一致',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => '参数验证失败',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
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
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'created_at' => $user->created_at,
                ],
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

        return response()->json([
            'success' => true,
            'message' => '密码修改成功，其他设备已自动退出',
        ]);
    }
}
