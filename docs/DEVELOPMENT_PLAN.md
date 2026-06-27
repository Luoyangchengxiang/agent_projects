# Agent Monitor 项目评估与后续开发方案

> 写于 2026-06-27 | 作者：Aaron_Cheng + Hermes

---

## 一、现状评估

### 1.1 项目已完成度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 仪表盘 | ⭐⭐⭐⭐ 80% | 统计卡片+图表，但数据是静态聚合，无实时推送 |
| Agent 管理 | ⭐⭐⭐ 60% | CRUD 完整，但只是数据库操作，没有真正执行任务 |
| 执行日志 | ⭐⭐⭐⭐ 80% | 记录完整，有结果摘要 |
| 错误日志 | ⭐⭐⭐⭐ 80% | 分类、解决标记完整 |
| 错误告警 | ⭐⭐⭐ 60% | 规则引擎有了，但通知只有 log/webhook，没有邮件/企微/钉钉 |
| 性能监控 | ⭐⭐⭐⭐ 80% | 指标采集+图表完整 |
| 知识图谱 | ⭐⭐⭐ 60% | 双引擎渲染有了，但数据需手动录入 |
| 定时任务 | ⭐⭐⭐ 60% | CRUD+暂停/恢复有了，但没有真正调度器 |
| 数据报告 | ⭐⭐ 40% | 有框架，但报告内容是模板，没有真实数据聚合 |
| 客服系统 | ⭐⭐⭐ 60% | Ollama 对接有了，但无人工接管的实际流程 |
| 版本更新 | ⭐⭐⭐⭐ 80% | CRUD+通知中心完整 |
| 权限管理 | ⭐⭐⭐ 60% | 角色权限框架有了，但没有细粒度控制 |
| 测试覆盖 | ⭐⭐⭐⭐⭐ 95% | 194 个测试用例，覆盖良好 |
| CI/CD | ⭐⭐⭐⭐⭐ 95% | GitHub Actions 自动化完整 |
| 文档 | ⭐⭐⭐⭐ 85% | VitePress 教程+OpenAPI 完整 |

### 1.2 核心问题

**🔴 关键短板（必须解决）：**

1. **Agent 没有真正执行能力** — 现在的 Agent 只是数据库里的记录，不会真正跑任务。一个"监控系统"监控的是假数据。
2. **定时任务没有调度器** — CronJob 只是 CRUD，没有后台进程真正按 cron 表达式执行。
3. **告警通知没有真正送达** — 只写日志，没有邮件/企微/钉钉等实际通知渠道。
4. **报告内容是空壳** — 报告生成只是创建一条记录，没有真正聚合数据生成 PDF/HTML。

**🟡 体验短板（应该解决）：**

5. **没有实时更新** — 所有数据靠轮询，Agent 状态变了要手动刷新才能看到。
6. **没有数据导出** — 不能导出 CSV/Excel/PDF。
7. **没有操作审计日志** — 谁在什么时候做了什么操作，没有记录。
8. **没有系统设置页** — 比如 Ollama 地址、通知渠道配置等，写死在代码里。

**🟢 可以做但不急：**

9. 暗色/亮色主题切换
10. 移动端适配
11. 国际化
12. API Key 管理（给外部系统调用）

---

## 二、后续开发方案

### 第一期：让系统真正能用（预计 3-5 天）

> 目标：Agent 能执行任务，定时任务能自动跑，告警能通知到人。

#### 2.1 Agent 执行引擎

**做什么：** 让 Agent 能真正执行任务，而不只是数据库记录。

**技术方案：**
- 后端新增 `AgentExecutor` 服务
- Agent 配置中增加 `executor_type`（ollama/shell/api）
- 执行时调用 Ollama/命令行/外部 API，记录输入输出
- 执行结果写入 `execution_logs` 表

```
用户点击"执行" → AgentController::run()
  → AgentExecutor::execute($agent, $input)
    → 根据 executor_type 分发：
      - ollama: 调用 OllamaService->chat()
      - shell: 执行 shell 命令（沙箱）
      - api: 调用外部 API
    → 记录执行日志
    → 检查告警规则
  → 返回执行结果
```

**数据库变更：**
```sql
ALTER TABLE agents ADD COLUMN executor_type VARCHAR(20) DEFAULT 'ollama';
ALTER TABLE agents ADD COLUMN executor_config JSONB; -- 执行器配置
ALTER TABLE agents ADD COLUMN model VARCHAR(100);     -- 使用的模型名
```

**前端变更：**
- Agent 列表增加"执行"按钮
- 执行对话框：输入 prompt → 看到实时输出
- 执行结果展示区

#### 2.2 定时任务调度器

**做什么：** 让 CronJob 真正按时间自动执行。

**技术方案：**
- 用 Laravel 的 `Scheduler` + `Queue` 实现
- 每分钟检查一次到期的 CronJob
- 到期的任务 dispatch 到队列异步执行
- 执行结果写入 `cron_job_logs`

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    // 每分钟检查到期任务
    $schedule->call(function () {
        CronJob::where('status', 'active')
            ->where('next_run_at', '<=', now())
            ->each(function ($job) {
                dispatch(new ExecuteCronJob($job));
            });
    })->everyMinute();
}
```

**需要：**
- 配置 Laravel Queue（用 `database` driver，不需要 Redis）
- 创建 `ExecuteCronJob` Job 类
- CronJob 模型增加 `calculateNextRun()` 方法

#### 2.3 多渠道告警通知

**做什么：** 告警触发后真正通知到人。

**支持渠道：**
- ✉️ 邮件（SMTP）
- 💬 企业微信 Webhook
- 💬 钉钉 Webhook
- 💬 飞书 Webhook
- 🔗 自定义 Webhook（已有）

**技术方案：**
```php
// app/Services/NotificationService.php
class NotificationService
{
    public function send(AlertRule $rule, array $alert): void
    {
        $channels = json_decode($rule->notify_channels, true) ?? ['log'];

        foreach ($channels as $channel) {
            match ($channel) {
                'email' => $this->sendEmail($rule, $alert),
                'wechat' => $this->sendWechatWebhook($rule, $alert),
                'dingtalk' => $this->sendDingtalkWebhook($rule, $alert),
                'feishu' => $this->sendFeishuWebhook($rule, $alert),
                'webhook' => $this->sendCustomWebhook($rule, $alert),
                default => Log::channel('alert')->info('告警', $alert),
            };
        }
    }
}
```

**数据库变更：**
```sql
ALTER TABLE alert_rules ADD COLUMN notify_channels JSONB DEFAULT '["log"]';
ALTER TABLE alert_rules ADD COLUMN email_recipients JSONB;
ALTER TABLE alert_rules ADD COLUMN webhook_headers JSONB;
```

**前端变更：**
- 告警规则表单增加"通知渠道"多选
- 每个渠道的配置项（邮箱地址、webhook URL 等）

#### 2.4 报告生成引擎

**做什么：** 真正从数据库聚合数据，生成可下载的报告。

**报告类型：**
- 📊 周报：过去 7 天的 Agent 执行统计、错误率、性能趋势
- 📊 月报：过去 30 天的汇总
- 📊 选品报告：结合电商数据（如果有）
- 📊 自定义：选择时间范围和指标

**技术方案：**
```php
// app/Services/ReportGenerator.php
class ReportGenerator
{
    public function generateWeekly(): Report
    {
        $data = [
            'period' => [now()->subWeek(), now()],
            'agents' => $this->getAgentStats(),
            'executions' => $this->getExecutionStats(),
            'errors' => $this->getErrorStats(),
            'performance' => $this->getPerformanceStats(),
        ];

        $html = view('reports.weekly', $data)->render();
        $pdf = $this->htmlToPdf($html);

        return Report::create([
            'type' => 'weekly',
            'title' => "周报 {$data['period'][0]->format('m/d')} - {$data['period'][1]->format('m/d')}",
            'content' => $data,
            'html' => $html,
            'pdf_path' => $this->savePdf($pdf),
        ]);
    }
}
```

**依赖：** `barryvdh/laravel-dompdf`（HTML 转 PDF）

---

### 第二期：提升体验（预计 3-5 天）

> 目标：实时更新、数据导出、操作审计、系统设置。

#### 2.5 实时更新（SSE）

**做什么：** Agent 状态变化、新告警、新消息实时推送到前端。

**为什么选 SSE 而不是 WebSocket：**
- SSE 是单向推送（服务端→客户端），适合通知场景
- 不需要额外的 WebSocket 服务器
- Laravel 原生支持
- 前端用 `EventSource` API，代码简单

**技术方案：**
```php
// 后端
Route::get('/stream', function (Request $request) {
    return response()->eventStream(function () {
        while (true) {
            $updates = PollService::getUpdates($request->user());
            if ($updates) {
                yield 'data' => json_encode($updates);
            }
            sleep(3);
        }
    });
});
```

```javascript
// 前端
const es = new EventSource('/api/stream?token=xxx')
es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  if (data.type === 'alert') showAlert(data)
  if (data.type === 'agent_status') updateAgent(data)
}
```

#### 2.6 数据导出

**做什么：** 支持导出 CSV/Excel/PDF。

**支持导出的数据：**
- Agent 列表
- 执行日志
- 错误日志
- 性能指标
- 告警历史

**技术方案：**
```php
// 前端调用
GET /api/export/execution-logs?format=csv&date_from=2026-06-01&date_to=2026-06-27

// 后端
public function export(Request $request, string $type)
{
    $data = $this->queryData($type, $request->all());

    return match ($request->input('format', 'csv')) {
        'csv' => $this->toCsv($data),
        'xlsx' => $this->toExcel($data),  // 需要 maatwebsite/excel
        'pdf' => $this->toPdf($data),
    };
}
```

**前端变更：** 每个列表页增加"导出"按钮 + 格式选择下拉

#### 2.7 操作审计日志

**做什么：** 记录用户的关键操作，用于安全审计。

**记录的操作：**
- 登录/注销
- 创建/修改/删除 Agent
- 修改告警规则
- 修改权限
- 执行任务

**技术方案：**
```php
// app/Models/AuditLog.php
class AuditLog extends Model
{
    protected $fillable = ['user_id', 'action', 'target_type', 'target_id', 'details', 'ip_address'];
}

// 中间件自动记录
// app/Http/Middleware/AuditLog.php
public function handle(Request $request, Closure $next)
{
    $response = $next($request);

    if (in_array($request->method(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $this->getAction($request),
            'target_type' => $this->getTargetType($request),
            'ip_address' => $request->ip(),
            'details' => $request->only(['name', 'email', 'status']),
        ]);
    }

    return $response;
}
```

**前端变更：** 新增"审计日志"页面，支持按用户/操作类型/时间筛选

#### 2.8 系统设置

**做什么：** 可视化配置系统参数，不用改代码。

**可配置项：**
- Ollama 地址和模型
- 通知渠道配置（邮箱 SMTP、Webhook URL）
- 系统名称、Logo
- 数据保留天数
- API 超时时间

**技术方案：**
```sql
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,  -- ollama/notification/system
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string', -- string/boolean/json/number
    description VARCHAR(255),
    updated_at TIMESTAMP
);
```

```php
// 辅助函数
function setting(string $key, $default = null) {
    return Cache::remember("setting.{$key}", 3600, fn() =>
        Setting::where('key', $key)->value('value') ?? $default
    );
}

// 使用
$ollamaUrl = setting('ollama.base_url', 'http://localhost:11434');
```

---

### 第三期：高级功能（预计 5-7 天）

> 目标：智能分析、e-commerce 集成、高级可视化。

#### 2.9 智能错误分析

**做什么：** 用 AI 自动分析错误日志，给出修复建议。

**技术方案：**
- 错误日志新增"AI 分析"按钮
- 调用 Ollama 分析错误堆栈，给出修复建议
- 分析结果缓存，相同错误不重复分析

```php
public function analyze(ErrorLog $errorLog): JsonResponse
{
    $prompt = "分析以下错误并给出修复建议：\n\n{$errorLog->stack_trace}";

    $analysis = $this->ollama->chat($prompt, '你是一个资深开发工程师');

    $errorLog->update(['ai_analysis' => $analysis]);

    return response()->json(['success' => true, 'data' => ['analysis' => $analysis]]);
}
```

#### 2.10 Agent 工作流编排

**做什么：** 多个 Agent 串联执行，形成工作流。

**场景示例（电商选品）：**
```
选品专家(分析趋势) → 运营管家(生成文案) → 决策引擎(定价策略) → 生成报告
```

**技术方案：**
```sql
CREATE TABLE workflows (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    steps JSONB NOT NULL,  -- [{agent_id, input_template, output_key}]
    status VARCHAR(20) DEFAULT 'draft',
    created_by BIGINT REFERENCES users(id)
);

CREATE TABLE workflow_runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT REFERENCES workflows(id),
    status VARCHAR(20),  -- running/completed/failed
    current_step INTEGER DEFAULT 0,
    results JSONB,       -- 每步的输出
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);
```

**前端：** 拖拽式工作流编辑器（可以用 @antv/g6 的 DAG 编辑能力）

#### 2.11 电商数据集成

**做什么：** 对接 1688/淘宝数据，实现真实选品。

**集成点：**
- 1688 商品搜索 API
- 淘宝热销榜爬取（或 API）
- 选品报告自动结合真实数据

**这一步需要：**
- 1688 开放平台 App Key
- 或者用爬虫方案（注意合规）

#### 2.12 前端体验优化

**做什么：**
- 暗色/亮色主题一键切换
- 移动端响应式适配
- 快捷键支持（`/` 搜索，`Ctrl+K` 命令面板）
- 页面切换动画
- 骨架屏加载

---

## 三、推荐优先级

```
┌─────────────────────────────────────────────────────┐
│  第一期（让系统真正能用）— 3-5天                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ 2.1 Agent 执行引擎     ★★★★★ 最核心          │  │
│  │ 2.2 定时任务调度器     ★★★★☆                 │  │
│  │ 2.3 多渠道告警通知     ★★★★☆                 │  │
│  │ 2.4 报告生成引擎       ★★★☆☆                 │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  第二期（提升体验）— 3-5天                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ 2.5 实时更新 SSE       ★★★★☆                 │  │
│  │ 2.6 数据导出           ★★★☆☆                 │  │
│  │ 2.7 操作审计日志       ★★★☆☆                 │  │
│  │ 2.8 系统设置           ★★★★☆                 │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  第三期（高级功能）— 5-7天                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ 2.9 AI 错误分析        ★★★☆☆                 │  │
│  │ 2.10 工作流编排        ★★★☆☆                 │  │
│  │ 2.11 电商数据集成      ★★★★★ 你的核心方向     │  │
│  │ 2.12 前端体验优化      ★★☆☆☆                 │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 四、技术决策建议

| 决策点 | 建议 | 原因 |
|--------|------|------|
| 实时推送 | SSE 而非 WebSocket | 简单够用，不需要额外服务器 |
| 队列 | Laravel database driver | 不需要 Redis，用现有 PostgreSQL |
| PDF 生成 | dompdf | 轻量，纯 PHP，不需要额外服务 |
| Excel 导出 | 前端直接生成 CSV | 避免后端依赖，用户打开就是 Excel |
| 工作流 | 先用简单的步骤列表 | 不急着上拖拽编辑器，MVP 先跑通 |
| 电商集成 | 先用 mock 数据 | 等功能跑通再对接真实 API |

---

## 五、踩坑预警

| 坑 | 说明 | 预防 |
|----|------|------|
| SSE 超时 | Nginx 默认 60s 断开 | 配置 `proxy_read_timeout 86400` |
| 队列死循环 | CronJob 执行出错反复重试 | 设置 `maxExceptions=3` + `--tries=1` |
| dompdf 中文 | 默认不支持中文 | 下载中文字体，配置 `@font-face` |
| Ollama 超时 | 大模型响应慢 | 设置合理 timeout + 前端 loading |
| 审计日志膨胀 | 每天几千条 | 定期归档，只保留 90 天 |
| 告警风暴 | 短时间大量触发 | 同一规则 5 分钟内只通知一次 |

---

## 六、文件结构规划（新增部分）

```
agent-monitor/
├── agent-api/
│   ├── app/
│   │   ├── Console/
│   │   │   └── Kernel.php              # 调度器（新增 CronJob 检查）
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── SettingController.php    # 新增
│   │   │   │   ├── AuditLogController.php   # 新增
│   │   │   │   └── ExportController.php     # 新增
│   │   │   └── Middleware/
│   │   │       └── AuditLogMiddleware.php   # 新增
│   │   ├── Jobs/
│   │   │   └── ExecuteCronJob.php           # 新增
│   │   ├── Models/
│   │   │   ├── Setting.php                  # 新增
│   │   │   └── AuditLog.php                 # 新增
│   │   ├── Notifications/
│   │   │   └── AlertNotification.php        # 新增
│   │   └── Services/
│   │       ├── AgentExecutor.php            # 新增
│   │       ├── NotificationService.php      # 新增
│   │       └── ReportGenerator.php          # 重构
│   └── database/migrations/
│       ├── create_settings_table.php        # 新增
│       ├── create_audit_logs_table.php      # 新增
│       └── create_workflows_table.php       # 新增
│
├── apps/web/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AuditLogs.jsx               # 新增
│   │   │   ├── SystemSettings.jsx           # 新增
│   │   │   └── WorkflowEditor.jsx           # 新增（第三期）
│   │   ├── services/
│   │   │   ├── settingsApi.js               # 新增
│   │   │   ├── auditApi.js                  # 新增
│   │   │   ├── exportApi.js                 # 新增
│   │   │   └── sseClient.js                 # 新增
│   │   └── hooks/
│   │       └── useSSE.js                    # 新增
```

---

## 七、我的建议

如果让我选 **最先做的 3 件事**：

1. **Agent 执行引擎**（2.1）— 没有这个，系统就是空壳。这是让项目从"演示"变成"能用"的关键。
2. **系统设置页**（2.8）— 把 Ollama 地址、通知配置等从代码里拿出来，方便调试和部署。
3. **多渠道告警通知**（2.3）— 监控系统的核心价值就是"出了问题告诉你"。

这三个做完，项目就有了真正的实用价值。

---

*你觉得哪些功能最想先做？或者有什么新的想法？*
