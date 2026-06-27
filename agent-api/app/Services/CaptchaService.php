<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * 验证码服务
 * 生成和验证图形验证码
 */
class CaptchaService
{
    // 验证码字符集（排除容易混淆的字符）
    private const CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    
    // 验证码长度
    private const LENGTH = 4;
    
    // 验证码有效期（分钟）
    private const EXPIRE_MINUTES = 5;
    
    // 图片宽度
    private const WIDTH = 150;
    
    // 图片高度
    private const HEIGHT = 50;
    
    // 最大尝试次数
    private const MAX_ATTEMPTS = 5;

    /**
     * 生成验证码
     * @return array ['image' => 'base64_image', 'token' => 'captcha_token']
     */
    public function generate(): array
    {
        // 生成随机验证码
        $code = $this->generateCode();
        
        // 生成唯一token
        $token = Str::random(32);
        
        // 存储到缓存
        $cacheKey = "captcha:{$token}";
        Cache::put($cacheKey, [
            'code' => strtolower($code),
            'attempts' => 0,
            'created_at' => now()->timestamp,
        ], now()->addMinutes(self::EXPIRE_MINUTES));
        
        // 生成验证码图片
        $image = $this->generateImage($code);
        
        return [
            'image' => $image,
            'token' => $token,
            'expire_minutes' => self::EXPIRE_MINUTES,
        ];
    }

    /**
     * 验证验证码
     * @param string $token 验证码token
     * @param string $code 用户输入的验证码
     * @return bool
     */
    public function verify(string $token, string $code): bool
    {
        $cacheKey = "captcha:{$token}";
        $cached = Cache::get($cacheKey);
        
        if (!$cached) {
            return false; // 验证码不存在或已过期
        }
        
        // 检查尝试次数
        if ($cached['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($cacheKey);
            return false; // 超过最大尝试次数
        }
        
        // 增加尝试次数
        $cached['attempts']++;
        Cache::put($cacheKey, $cached, now()->addMinutes(self::EXPIRE_MINUTES));
        
        // 验证验证码（不区分大小写）
        if (strtolower($code) === $cached['code']) {
            Cache::forget($cacheKey); // 验证成功后删除
            return true;
        }
        
        return false;
    }

    /**
     * 生成随机验证码
     */
    private function generateCode(): string
    {
        $code = '';
        $length = strlen(self::CHARACTERS);
        
        for ($i = 0; $i < self::LENGTH; $i++) {
            $code .= self::CHARACTERS[random_int(0, $length - 1)];
        }
        
        return $code;
    }

    /**
     * 生成验证码图片
     */
    private function generateImage(string $code): string
    {
        // 创建画布
        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        
        // 背景色（浅灰色）
        $bgColor = imagecolorallocate($image, 245, 245, 245);
        imagefill($image, 0, 0, $bgColor);
        
        // 添加干扰线
        $this->addNoiseLines($image);
        
        // 添加噪点
        $this->addNoiseDots($image);
        
        // 绘制验证码
        $this->drawCode($image, $code);
        
        // 转换为base64
        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);
        
        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    /**
     * 添加干扰线
     */
    private function addNoiseLines($image): void
    {
        $colors = [
            imagecolorallocate($image, 210, 210, 210),  // 浅灰
            imagecolorallocate($image, 200, 200, 200),  // 浅灰
        ];
        
        // 倒数第二档：2条干扰线
        for ($i = 0; $i < 2; $i++) {
            $color = $colors[array_rand($colors)];
            $x1 = random_int(0, self::WIDTH);
            $y1 = random_int(0, self::HEIGHT);
            $x2 = random_int(0, self::WIDTH);
            $y2 = random_int(0, self::HEIGHT);
            imageline($image, $x1, $y1, $x2, $y2, $color);
        }
    }

    /**
     * 添加噪点
     */
    private function addNoiseDots($image): void
    {
        $color = imagecolorallocate($image, 180, 180, 180);  // 浅灰色噪点
        
        // 倒数第二档：30个噪点
        for ($i = 0; $i < 30; $i++) {
            $x = random_int(0, self::WIDTH);
            $y = random_int(0, self::HEIGHT);
            imagesetpixel($image, $x, $y, $color);
        }
    }

    /**
     * 绘制验证码文字
     */
    private function drawCode($image, string $code): void
    {
        $colors = [
            imagecolorallocate($image, 60, 60, 60),     // 深灰
            imagecolorallocate($image, 120, 60, 60),    // 深红
            imagecolorallocate($image, 60, 120, 60),    // 深绿
            imagecolorallocate($image, 60, 60, 120),    // 深蓝
        ];
        
        $fontPath = resource_path('fonts/captcha.ttf');
        $hasFont = file_exists($fontPath);
        
        $x = 18; // 起始x坐标（增加间距）
        
        for ($i = 0; $i < strlen($code); $i++) {
            $color = $colors[array_rand($colors)];
            $char = $code[$i];
            
            if ($hasFont) {
                // 使用自定义字体（更清晰）
                $fontSize = random_int(25, 29);  // 增大3px
                $angle = random_int(-8, 8);  // 减小倾斜角度
                $y = random_int(34, 40);
                imagettftext($image, $fontSize, $angle, $x, $y, $color, $fontPath, $char);
                $x += 32;  // 增加字符间距
            } else {
                // 使用内置字体
                $fontSize = random_int(5, 6);
                $y = random_int(15, 25);
                imagechar($image, $fontSize, $x, $y, $char, $color);
                $x += 28;  // 增加字符间距
            }
        }
    }
}
