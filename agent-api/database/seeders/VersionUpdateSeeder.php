<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\VersionUpdate;

class VersionUpdateSeeder extends Seeder
{
    public function run(): void
    {
        $versions = [
            // v1.3.0 - Phase 3 定时任务管理
            [
                'version' => 'v1.3.0',
                'title' => '定时任务管理系统',
                'content' => "• 定时任务 CRUD（创建/读取/更新/删除）\n• 任务状态管理（运行中/暂停/异常）\n• 一键暂停/恢复任务\n• 手动触发执行任务\n• 执行统计（成功率、执行次数）\n• 执行日志查看\n• Cron 预设表达式快速选择\n• 搜索和状态筛选\n• 消息通知已读状态持久化修复",
                'type' => 'feature',
                'release_date' => '2026-06-26',
                'is_highlight' => true,
            ],
            // v1.2.0 - Phase 2 知识图谱
            [
                'version' => 'v1.2.0',
                'title' => 'Agent 知识图谱系统',
                'content' => "• ECharts Graph 力导向图可视化\n• 节点和边的 CRUD 操作\n• 节点搜索和过滤\n• 动态刷新（10秒自动更新）\n• 节点运行状态显示（运行中/空闲）\n• 状态图例和暂停控制\n• 交互操作（拖拽、缩放、点击详情）\n• 种子数据初始化\n• 10 个 API 单元测试",
                'type' => 'feature',
                'release_date' => '2026-06-26',
                'is_highlight' => true,
            ],
            // v1.1.0 - Phase 1 数据报告
            [
                'version' => 'v1.1.0',
                'title' => '数据报告与导出系统',
                'content' => "• 周报/月报/选品报告自动生成\n• CSV 数据导出功能\n• 报告列表和详情查看\n• 执行结果汇总展示\n• 结果摘要展开/收起\n• Markdown 格式渲染\n• 执行结果详情弹窗\n• 自动收集执行结果脚本（每日 9:10）",
                'type' => 'feature',
                'release_date' => '2026-06-26',
                'is_highlight' => true,
            ],
            // v1.0.0 - 正式版
            [
                'version' => 'v1.0.0',
                'title' => 'Agent 监控系统正式版',
                'content' => "• 仪表盘统计卡片和图表\n• Agent 列表管理（CRUD）\n• 执行日志查看（分页、筛选）\n• 错误日志系统（17种错误类型）\n• 消息中心（执行结果、错误日志、客服消息、版本更新）\n• 权限管理（普通用户/VIP/管理员）\n• DDoS 防护和 API 限流\n• 首屏加载优化（代码分割 + preload-screen）",
                'type' => 'feature',
                'release_date' => '2026-06-26',
                'is_highlight' => true,
            ],
            // v0.3.0 - 看板娘系统
            [
                'version' => 'v0.3.0',
                'title' => '看板娘 Live2D 系统',
                'content' => "• 14 个 Live2D 看板娘模型\n• 形象选择页面（首次登录）\n• 拖拽移动功能\n• 环状交互菜单（表情切换）\n• 小紫眼睛循环偷看动画\n• 形象持久化到数据库（防篡改）\n• 管理员可随意更换，普通用户锁定\n• 静态 SVG 回退方案",
                'type' => 'feature',
                'release_date' => '2026-06-25',
                'is_highlight' => false,
            ],
            // v0.2.1 - 竞态修复
            [
                'version' => 'v0.2.1',
                'title' => '登录竞态条件修复',
                'content' => "• 修复登录后重定向到登录页的竞态条件\n• init() 和 login() 之间不再互相覆盖状态\n• 新增 4 个竞态条件测试用例\n• 全部 30 个单元测试通过",
                'type' => 'fix',
                'release_date' => '2026-06-23',
                'is_highlight' => false,
            ],
            // v0.2.0 - 客服系统
            [
                'version' => 'v0.2.0',
                'title' => '客服 Agent 与看板娘',
                'content' => "• AI 自动回复（基于 Ollama 本地模型）\n• 人工接管功能\n• 客服管理后台页面\n• 实时对话界面\n• 看板娘 Live2D 组件\n• 环状交互菜单\n• 眼睛跟随鼠标效果\n• Docker 部署文件\n• VitePress 文档项目",
                'type' => 'feature',
                'release_date' => '2026-06-22',
                'is_highlight' => false,
            ],
            // v0.1.0 - 基础架构
            [
                'version' => 'v0.1.0',
                'title' => '基础架构搭建',
                'content' => "• 前端 Monorepo 结构（pnpm workspaces）\n• 后端 Laravel 11 + Sanctum 认证\n• PostgreSQL 主库 + Redis 缓存\n• 暗色科技风格 UI（主色调 #06b6d4）\n• 认证系统（登录/注册/JWT）\n• Agent 列表和执行日志页面\n• 错误日志系统\n• DDoS 防护\n• 26 个前端单元测试",
                'type' => 'feature',
                'release_date' => '2026-06-21',
                'is_highlight' => false,
            ],
            // v0.0.1 - 初始化
            [
                'version' => 'v0.0.1',
                'title' => '项目初始化',
                'content' => "• 项目初始化\n• 技术栈选型（React + Laravel + PostgreSQL）\n• 环境搭建（Node.js, pnpm, PHP, Composer）",
                'type' => 'feature',
                'release_date' => '2026-06-20',
                'is_highlight' => false,
            ],
        ];

        foreach ($versions as $version) {
            VersionUpdate::create($version);
        }

        $this->command->info('已创建 ' . count($versions) . ' 条版本更新记录');
    }
}
