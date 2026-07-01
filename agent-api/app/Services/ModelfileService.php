<?php

namespace App\Services;

use App\Models\Agent;
use Illuminate\Support\Facades\Log;

/**
 * Modelfile 双向同步服务
 * 
 * 数据库 ↔ 本地 Modelfile
 */
class ModelfileService
{
    private string $basePath = '/home/cheng/local-ai/agents';

    /**
     * 获取 Agent 对应的本地 Modelfile 路径
     */
    public function getModelfilePath(Agent $agent): ?string
    {
        $name = $this->sanitizeName($agent->name);

        // 有父级 → 父级目录/子级目录/Modelfile
        if ($agent->parent_id && $agent->parent) {
            $parentName = $this->sanitizeName($agent->parent->name);
            $path = $this->basePath . '/' . $parentName . '/' . $name . '/Modelfile';
            return file_exists($path) ? $path : null;
        }

        // 顶级 Agent → 目录/Modelfile
        $path = $this->basePath . '/' . $name . '/Modelfile';
        return file_exists($path) ? $path : null;
    }

    /**
     * 清理名称中的路径遍历字符
     */
    private function sanitizeName(string $name): string
    {
        // 移除路径分隔符和 .. 防止目录遍历
        return str_replace(['/', '\\', '..', "\0"], '', $name);
    }

    /**
     * 解析本地 Modelfile
     */
    public function parseModelfile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            return [];
        }

        $content = file_get_contents($filePath);
        $result = [
            'model' => null,
            'system_prompt' => null,
            'parameters' => [],
        ];

        // 解析 FROM
        if (preg_match('/^FROM\s+(.+)$/m', $content, $m)) {
            $result['model'] = trim($m[1]);
        }

        // 解析 SYSTEM（三引号格式）
        if (preg_match('/SYSTEM\s+"""(.*?)"""/s', $content, $m)) {
            $result['system_prompt'] = trim($m[1]);
        } elseif (preg_match('/SYSTEM\s+"(.*?)"/s', $content, $m)) {
            $result['system_prompt'] = trim($m[1]);
        }

        // 解析 PARAMETER
        if (preg_match_all('/^PARAMETER\s+(\w+)\s+(.+)$/m', $content, $m, PREG_SET_ORDER)) {
            foreach ($m as $match) {
                $key = trim($match[1]);
                $val = trim($match[2]);
                // 数值类型转换
                if (is_numeric($val)) {
                    $val = str_contains($val, '.') ? (float)$val : (int)$val;
                }
                $result['parameters'][$key] = $val;
            }
        }

        return $result;
    }

    /**
     * 生成 Modelfile 内容
     */
    public function generateModelfile(Agent $agent, array $parameters = []): string
    {
        $model = $agent->model ?: 'qwen2.5:3b';
        $prompt = $agent->system_prompt ?: '';

        $lines = [];
        $lines[] = "FROM {$model}";
        $lines[] = '';
        $lines[] = 'SYSTEM """';
        $lines[] = $prompt;
        $lines[] = '"""';
        $lines[] = '';

        // 写入参数
        if (!empty($parameters)) {
            foreach ($parameters as $key => $value) {
                $lines[] = "PARAMETER {$key} {$value}";
            }
        }

        return implode("\n", $lines) . "\n";
    }

    /**
     * 写入 Modelfile 到本地
     */
    public function writeModelfile(Agent $agent, ?array $parameters = null): bool
    {
        $path = $this->getModelfilePath($agent);

        // 如果文件不存在，尝试构建路径
        if (!$path) {
            $path = $this->buildPath($agent);
            if (!$path) return false;
        }

        // 如果没传参数，从现有文件读取
        if ($parameters === null) {
            $existing = $this->parseModelfile($path);
            $parameters = $existing['parameters'] ?? [];
        }

        $content = $this->generateModelfile($agent, $parameters);

        try {
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents($path, $content);
            Log::info("Modelfile 已写入: {$path}");
            return true;
        } catch (\Exception $e) {
            Log::error("Modelfile 写入失败: {$path} - {$e->getMessage()}");
            return false;
        }
    }

    /**
     * 从本地 Modelfile 同步到数据库
     */
    public function syncToDatabase(Agent $agent): bool
    {
        $path = $this->getModelfilePath($agent);
        if (!$path) return false;

        $parsed = $this->parseModelfile($path);
        if (empty($parsed)) return false;

        $changed = false;
        if ($parsed['model'] && $parsed['model'] !== $agent->model) {
            $agent->model = $parsed['model'];
            $changed = true;
        }
        if ($parsed['system_prompt'] && $parsed['system_prompt'] !== $agent->system_prompt) {
            $agent->system_prompt = $parsed['system_prompt'];
            $changed = true;
        }

        if ($changed) {
            $agent->save();
            Log::info("Modelfile → DB 同步: {$agent->name}");
        }

        return $changed;
    }

    /**
     * 从数据库同步到本地 Modelfile
     */
    public function syncToLocal(Agent $agent): bool
    {
        return $this->writeModelfile($agent);
    }

    /**
     * 全量同步：DB → 本地
     */
    public function syncAllToLocal(): array
    {
        $results = [];
        $agents = Agent::all();
        foreach ($agents as $agent) {
            $path = $this->getModelfilePath($agent);
            if ($path) {
                $ok = $this->syncToLocal($agent);
                $results[] = ['agent' => $agent->name, 'synced' => $ok];
            }
        }
        return $results;
    }

    /**
     * 全量同步：本地 → DB
     * 1. 更新 DB 中已有 Agent 的 prompt/model
     * 2. 本地存在但 DB 中不存在的 Agent → 自动创建
     */
    public function syncAllToDatabase(): array
    {
        $results = [];

        // 第一步：扫描本地目录
        $localAgents = $this->scanLocalAgents();

        // 第二步：先创建组（parent_name 为 null 且 is_group=true）
        foreach ($localAgents as $info) {
            if (!empty($info['is_group'])) {
                $exists = Agent::where('name', $info['name'])->first();
                if (!$exists) {
                    $agent = Agent::create([
                        'name' => $info['name'],
                        'type' => 'team',
                        'status' => 'offline',
                        'executor_type' => 'ollama',
                    ]);
                    $results[] = ['agent' => $info['name'], 'synced' => true, 'action' => 'created (group)'];
                    Log::info("本地 → DB 创建组: {$info['name']}");
                }
            }
        }

        // 第三步：创建子 Agent 和独立 Agent
        foreach ($localAgents as $info) {
            if (!empty($info['is_group'])) continue; // 组已处理

            $exists = Agent::where('name', $info['name'])->first();
            if (!$exists) {
                // 查找父级 ID
                $parentId = null;
                if (!empty($info['parent_name'])) {
                    $parent = Agent::where('name', $info['parent_name'])->first();
                    $parentId = $parent?->id;
                }

                $agent = Agent::create([
                    'name' => $info['name'],
                    'type' => 'local',
                    'status' => 'offline',
                    'executor_type' => 'ollama',
                    'model' => $info['model'],
                    'system_prompt' => $info['system_prompt'],
                    'parent_id' => $parentId,
                ]);
                $label = $parentId ? 'created (child)' : 'created';
                $results[] = ['agent' => $info['name'], 'synced' => true, 'action' => $label];
                Log::info("本地 → DB 创建: {$info['name']}");
            }
        }

        // 第四步：更新 DB 中已有 Agent 的 prompt/model
        $agents = Agent::all();
        foreach ($agents as $agent) {
            $changed = $this->syncToDatabase($agent);
            if ($changed) {
                $results[] = ['agent' => $agent->name, 'synced' => true, 'action' => 'updated'];
            }
        }

        return $results;
    }

    /**
     * 扫描本地 agents 目录，返回所有 Modelfile 信息
     */
    private function scanLocalAgents(): array
    {
        $results = [];
        $basePath = $this->basePath;

        if (!is_dir($basePath)) return $results;

        // 扫描顶级目录
        $topDirs = array_filter(glob($basePath . '/*'), 'is_dir');
        foreach ($topDirs as $dir) {
            $name = basename($dir);

            // 扫描子目录（组内 Agent）— 先收集子目录信息
            $subDirs = array_filter(glob($dir . '/*'), 'is_dir');
            $hasChildren = false;
            foreach ($subDirs as $subDir) {
                $subName = basename($subDir);
                // 跳过非 Agent 目录
                if (in_array($subName, ['chroma_db', '__pycache__', '共享文档', '优化记录', '报告', '案例库'])) continue;
                $subModelfile = $subDir . '/Modelfile';
                if (file_exists($subModelfile)) {
                    $hasChildren = true;
                    $parsed = $this->parseModelfile($subModelfile);
                    $results[] = [
                        'name' => $subName,
                        'model' => $parsed['model'] ?? null,
                        'system_prompt' => $parsed['system_prompt'] ?? null,
                        'parent_name' => $name,  // 先用名字，后面转 ID
                    ];
                }
            }

            // 如果有子目录，说明是组（即使没有自己的 Modelfile）
            if ($hasChildren) {
                $modelfile = $dir . '/Modelfile';
                $parsed = file_exists($modelfile) ? $this->parseModelfile($modelfile) : [];
                $results[] = [
                    'name' => $name,
                    'model' => $parsed['model'] ?? null,
                    'system_prompt' => $parsed['system_prompt'] ?? null,
                    'parent_name' => null,
                    'is_group' => true,
                ];
            } else {
                // 独立 Agent（有 Modelfile 但没有子目录）
                $modelfile = $dir . '/Modelfile';
                if (file_exists($modelfile)) {
                    $parsed = $this->parseModelfile($modelfile);
                    $results[] = [
                        'name' => $name,
                        'model' => $parsed['model'] ?? null,
                        'system_prompt' => $parsed['system_prompt'] ?? null,
                        'parent_name' => null,
                    ];
                }
            }
        }

        return $results;
    }

    /**
     * 构建路径（文件不存在时）
     */
    private function buildPath(Agent $agent): ?string
    {
        $name = $this->sanitizeName($agent->name);
        if ($agent->parent_id && $agent->parent) {
            $parentName = $this->sanitizeName($agent->parent->name);
            $dir = $this->basePath . '/' . $parentName . '/' . $name;
        } else {
            $dir = $this->basePath . '/' . $name;
        }
        return $dir . '/Modelfile';
    }
}
