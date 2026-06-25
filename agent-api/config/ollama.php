<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Ollama 服务配置
    |--------------------------------------------------------------------------
    */

    // Ollama API 地址
    'base_url' => env('OLLAMA_BASE_URL', 'http://localhost:11434'),

    // 默认模型
    'model' => env('OLLAMA_MODEL', 'qwen2.5:3b'),

    // 请求超时（秒）
    'timeout' => env('OLLAMA_TIMEOUT', 30),

    // 生成参数
    'options' => [
        'temperature' => 0.7,
        'num_predict' => 512,
    ],
];
