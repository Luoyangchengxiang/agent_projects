import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Agent Monitor 开发教程',
  ignoreDeadLinks: true,
  description: '从零搭建 Agent 监控系统的完整教程',
  lang: 'zh-CN',
  base: '/agent-monitor/',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/quickstart' },
      { text: '开发教程', link: '/guide/overview' },
      { text: 'API 文档', link: '/api/overview' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '项目概览', link: '/guide/overview' },
            { text: '环境搭建', link: '/guide/environment' },
            { text: '快速开始', link: '/guide/quickstart' },
          ]
        },
        {
          text: '前端开发',
          items: [
            { text: '项目结构', link: '/guide/frontend-structure' },
            { text: '页面开发', link: '/guide/frontend-pages' },
            { text: 'API 对接', link: '/guide/frontend-api' },
            { text: '测试编写', link: '/guide/frontend-testing' },
          ]
        },
        {
          text: '后端开发',
          items: [
            { text: 'Laravel 基础', link: '/guide/backend-basics' },
            { text: '数据库设计', link: '/guide/database' },
            { text: 'API 开发', link: '/guide/backend-api' },
            { text: '中间件', link: '/guide/middleware' },
            { text: '测试编写', link: '/guide/backend-testing' },
          ]
        },
        {
          text: '功能模块',
          items: [
            { text: '错误告警系统', link: '/modules/alerts' },
            { text: '性能监控系统', link: '/modules/metrics' },
            { text: '知识图谱', link: '/modules/graph' },
            { text: '定时任务', link: '/modules/cronjobs' },
          ]
        },
        {
          text: '部署与运维',
          items: [
            { text: 'Docker 部署', link: '/guide/docker' },
            { text: 'CI/CD 流水线', link: '/guide/cicd' },
            { text: '公网穿透', link: '/guide/tunnel' },
            { text: '常见问题 QA', link: '/guide/qa' },
          ]
        },
      ],
      '/api/': [
        {
          text: 'API 文档',
          items: [
            { text: '概览', link: '/api/overview' },
            { text: '认证', link: '/api/auth' },
            { text: 'Agent', link: '/api/agents' },
            { text: '告警规则', link: '/api/alerts' },
            { text: '性能指标', link: '/api/metrics' },
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Luoyangchengxiang/agent_projects' }
    ],
    footer: {
      message: 'Agent Monitor 开发教程',
      copyright: 'Aaron_Cheng'
    },
    search: {
      provider: 'local'
    },
    outline: {
      level: [2, 3],
      label: '本页目录'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    }
  }
})
