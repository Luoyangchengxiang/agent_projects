import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Agent Monitor Docs",
  description: "智能体监控与客服系统使用文档",
  ignoreDeadLinks: true, // 忽略 localhost 链接检查
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: 'Docker 部署', link: '/guide/docker' }
    ],
    sidebar: [
      {
        text: '入门',
        items: [
          { text: '介绍', link: '/guide/' },
          { text: 'Docker 部署', link: '/guide/docker' }
        ]
      }
    ]
  }
})
