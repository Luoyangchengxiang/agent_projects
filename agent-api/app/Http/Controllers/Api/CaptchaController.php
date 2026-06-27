<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;

/**
 * 验证码控制器
 */
class CaptchaController extends Controller
{
    public function __construct(
        private CaptchaService $captchaService
    ) {}

    /**
     * GET /api/captcha
     * 生成验证码
     */
    public function generate(): JsonResponse
    {
        $result = $this->captchaService->generate();

        return response()->json([
            'success' => true,
            'data' => [
                'captcha_image' => $result['image'],
                'captcha_token' => $result['token'],
                'expire_minutes' => $result['expire_minutes'],
            ],
        ]);
    }
}
