# KeepAlive Tabs Kit

[![Deploy Storybook to GitHub Pages](https://github.com/aiyoudiao/keepalive-tabs-kit/actions/workflows/storybook-pages.yml/badge.svg)](https://github.com/aiyoudiao/keepalive-tabs-kit/actions/workflows/storybook-pages.yml)
[![License](https://img.shields.io/github/license/aiyoudiao/keepalive-tabs-kit)](./LICENSE)

一个基于 React Router v6 的“最小可复用” KeepAlive Tabs 方案：路由驱动多页签、拖拽排序、右键菜单、页面缓存与刷新恢复。仓库本身是可直接运行与二次改造的 Demo 工程。

## 演示

<p align="center">
  <img src="./sources/20260212-161952.gif" alt="KeepAlive Tabs Demo 1" width="960" />
</p>
<p align="center">
  <img src="./sources/20260212-162337.gif" alt="KeepAlive Tabs Demo 2" width="960" />
</p>
<p align="center">
  <img src="./sources/20260212-163025.gif" alt="KeepAlive Tabs Demo 2" width="960" />
</p>

- 在线预览（GitHub Pages）：https://aiyoudiao.github.io/keepalive-tabs-kit/
- Storybook：同上（Pages 里就是 Storybook 静态站点）

## 目录

- [KeepAlive Tabs Kit](#keepalive-tabs-kit)
  - [演示](#演示)
  - [目录](#目录)
  - [特性](#特性)
  - [快速开始](#快速开始)
    - [环境要求](#环境要求)
    - [启动开发服务](#启动开发服务)
    - [构建](#构建)
  - [用法（在你自己的项目里复用）](#用法在你自己的项目里复用)
  - [API 说明](#api-说明)
    - [KeepAliveLayout](#keepalivelayout)
    - [RouteInfo](#routeinfo)
    - [刷新恢复（持久化）](#刷新恢复持久化)
  - [关键实现与约束](#关键实现与约束)
  - [开发命令](#开发命令)
  - [常见问题](#常见问题)
    - [为什么不用把 outlet 放进 state？](#为什么不用把-outlet-放进-state)
    - [刷新恢复存在哪里？](#刷新恢复存在哪里)
  - [贡献](#贡献)
  - [安全](#安全)
  - [许可证](#许可证)

## 特性

- 路由驱动 Tabs：访问路由自动生成页签
- KeepAlive：Tab 切换不卸载页面（组件 state 保留）
- 拖拽排序：支持调整 Tab 顺序，并持久化到 `sessionStorage`
- 右键菜单：重新加载、关闭当前、关闭左侧/右侧、关闭其它
- 刷新恢复：刷新后从 `sessionStorage` 恢复 Tab 列表
- 错误兜底：ErrorBoundary 捕获渲染期异常并给出可恢复 UI
- 依赖极简：React / React Router / Antd / @dnd-kit / Vite / TypeScript

## 快速开始

### 环境要求

- Node.js 18+（推荐 20）
- pnpm 8+（建议用 corepack 固定 pnpm 版本）

### 启动开发服务

```bash
pnpm install
pnpm dev
```

打开：

- http://localhost:8000/

### 构建

```bash
pnpm build
```

## 作为 npm 包使用（推荐）

```bash
pnpm add keepalive-tabs-kit
# 或 npm i keepalive-tabs-kit
```

```tsx
import { KeepAliveLayout, RouteConfig } from 'keepalive-tabs-kit';
import 'keepalive-tabs-kit/style.css';
```

## 用法（在你自己的项目里复用）

这套实现更偏“可复制粘贴的 Kit”，推荐直接把实现文件带走：

1. 拷贝目录：
   - `src/components/KeepAliveTabs/*`
2. 拷贝样式（或按你项目的布局体系改造）：
   - `src/index.css` 中与 `.app-shell/.tabs-bar/.tabs-content` 相关部分
3. 在你的路由入口中，把根路由的 `element` 换成 `KeepAliveLayout`，并传入 `routeConfig`（用于 Tab 标题、图标与 keepAlive 开关）

示例（可直接参考现成实现）：[routes/index.tsx](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/routes/index.tsx#L10-L27)

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { KeepAliveLayout, RouteConfig } from '@/components/KeepAliveTabs';

const routeConfig: RouteConfig = {
  '/': { name: '首页' },
  '/about': { name: '关于' },
  '/counter/:id': { name: 'Counter' },
  '/404': { name: '404', keepAlive: false },
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <KeepAliveLayout routeConfig={routeConfig} />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'counter/:id', element: <Counter /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
```

如果你想快速验证一份“可复制的最小用法”，也可以看 Storybook 的 MemoryRouter 版本：[KeepAliveTabs.stories.tsx](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/components/KeepAliveTabs/KeepAliveTabs.stories.tsx#L19-L45)


### Core 与 UI 解耦（进阶）

当前已将核心状态管理抽离为 `useKeepAliveManager`，默认 `KeepAliveLayout` + `TabsBar` 为 antd UI 实现。
如果你要自定义 UI，可以复用 core hook 构建自己的 tab 头部和内容区。

```ts
import { useKeepAliveManager } from 'keepalive-tabs-kit';
```

## API 说明

### KeepAliveLayout

从 [components/KeepAliveTabs/index.ts](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/components/KeepAliveTabs/index.ts) 导出：

```ts
type KeepAliveLayoutProps = {
  routeConfig: RouteConfig;
  namespace?: string;
  storage?: {
    read: (key: string) => string | null;
    write: (key: string, value: string) => void;
  };
  onTabOpen?: (payload: { path: string; title: string }) => void;
  onTabClose?: (payload: { path: string; title: string }) => void;
  onRestore?: (paths: string[]) => void;
};
```

- `routeConfig`：`Record<string, RouteInfo>`
  - key 支持静态路由（`/about`）与动态路由 pattern（`/counter/:id`）
  - 内部使用 `matchPath(pattern, pathname)` 匹配动态路由

### RouteInfo

```ts
type RouteInfo = {
  name: string;
  icon?: React.ReactNode;
  keepAlive?:
    | boolean
    | {
        max?: number;
        ttl?: number;
        reuse?: boolean;
        strategy?: 'lru' | 'fifo';
      };
};
```

- `name`：Tab 标题
- `icon`：Tab 图标（可选）
- `keepAlive`：支持 `boolean` 或对象
  - `false`：禁用缓存
  - `{ max?: number; ttl?: number; reuse?: boolean }`：
    - `max`：最大缓存 tab 数（超出后自动淘汰最旧 tab）
    - `ttl`：缓存生存时间（毫秒）
    - `reuse`：默认 `true`，设为 `false` 时会将 query 计入缓存 key
    - `strategy`：淘汰策略，支持 `lru`（最近最少使用，默认）或 `fifo`（先进先出）

### 刷新恢复（持久化）

- 默认使用 `sessionStorage['__keepalive_tabs_list__']` 持久化 Tab 路径（统一转小写）

## 关键实现与约束

- 关键文件：
  - KeepAlive 核心：[KeepAliveLayout.tsx](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/components/KeepAliveTabs/KeepAliveLayout.tsx)
  - Tabs UI（拖拽 + 右键）：[TabsBar.tsx](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/components/KeepAliveTabs/TabsBar.tsx)
  - 类型：[types.ts](file:///c:/MyWork/open_source/keepalive-tabs-kit/src/components/KeepAliveTabs/types.ts)
- 重要约束：
  - 不要将 `useOutlet()` 返回值放入 React state（容易触发 “Maximum update depth exceeded” 的循环更新）。当前实现将缓存内容写入 ref，并在渲染时按 activePath 选择展示。

## 开发命令

```bash
pnpm dev              # 本地开发
pnpm build            # 构建（Vite + tsc）
pnpm preview          # 本地预览构建产物
pnpm storybook        # 启动 Storybook
pnpm build-storybook  # 构建 Storybook（输出 storybook-static/，用于 Pages）
pnpm test             # 运行测试（vitest）
pnpm typecheck        # 类型检查
```

## 常见问题

### 为什么不用把 outlet 放进 state？

`useOutlet()` 的返回值在每次渲染时可能是新引用。如果 effect 依赖 `outlet` 并 `setState`，会导致无限更新循环。当前实现把缓存内容写入 ref，避免这个问题。

### 刷新恢复存在哪里？

使用 `sessionStorage['__keepalive_tabs_list__']` 保存 Tab 的路径（pathname 小写），刷新后用它恢复 Tab 列表。

## 贡献

欢迎 PR：

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## 安全

- [SECURITY.md](./SECURITY.md)


## 项目优化与 npm 包化

如果你希望把当前 Demo 进一步工程化，并最终做成可直接安装的 npm 包，可以参考：

- [docs.npm-plan.md](./docs.npm-plan.md)

文档覆盖了：可优化方向、功能扩展点、npm 包目录规划、最小发布步骤与目标使用体验。

## 许可证

MIT License，见 [LICENSE](./LICENSE)。
