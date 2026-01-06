# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

**重要说明：请始终使用中文与用户交互，所有回复、解释和沟通都应使用中文。**

## 项目概述

这是一个 "Nano Banana" AI 图像编辑服务的 Next.js 16 营销网站。项目使用：
- Next.js 16 with App Router（app 目录结构）
- React 19
- TypeScript（启用严格模式）
- Tailwind CSS v4 with PostCSS
- Radix UI 组件库（components/ui/ 中的完整组件集）
- shadcn/ui 设计模式
- Vercel Analytics 集成

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 运行代码检查
npm run lint
```

## 架构

### 目录结构

- `app/` - Next.js App Router 页面
  - `layout.tsx` - 根布局，包含字体（Geist、Geist Mono）和 Analytics
  - `page.tsx` - 主落地页（客户端组件，含图片上传 UI）
  - `globals.css` - Tailwind v4 导入和主题 CSS 自定义属性

- `components/` - React 组件
  - `ui/` - shadcn/ui/Radix UI 基础组件（60+ 个组件）
  - `theme-provider.tsx` - 主题上下文提供者

- `lib/` - 工具函数
  - `utils.ts` - `cn()` 辅助函数，用于合并 Tailwind 类名

- `hooks/` - 自定义 React hooks
  - `use-mobile.ts` - 移动端检测
  - `use-toast.ts` - 提示通知

### 关键模式

**组件导入：** 所有 UI 组件使用 `@/` 路径别名（在 tsconfig.json 中配置为映射到根目录）。

**主题：** 应用使用 CSS 自定义属性和 OKLCH 色彩空间支持亮色/暗色模式。主题值在 `globals.css` 中定义，通过 Tailwind 的 `@theme inline` 引用。

**样式：** Tailwind v4 配合 `@import "tailwindcss"` 和 `tw-animate-css` 自定义动画。`cn()` 工具函数结合 clsx 和 tailwind-merge 处理条件类名。

**客户端组件：** 主页面是客户端组件（使用 `"use client"` 指令），通过 hooks 管理图片上传状态和提示输入。

## 配置说明

- **TypeScript：** 在 `next.config.mjs` 中忽略构建错误（`ignoreBuildErrors: true`）
- **图片：** Next.js 配置中未优化（`unoptimized: true`）
- **路径别名：** `@/*` 映射到项目根目录用于导入
- **CSS：** 使用 Tailwind PostCSS 插件，定义了自定义暗色模式变体

## UI 组件

`components/ui/` 目录包含遵循 shadcn/ui 约定的预构建 Radix UI 组件。这些组件都有完整的类型定义，可直接使用。常用组件包括 Button、Card、Dialog、Accordion、Input、Textarea 等。
