# KeepAlive Tabs Kit 优化与扩展建议（含 npm 包化方案）

## 可以继续优化的方向

1. **拆分内核与 UI**
   - 目前 `KeepAliveLayout` 同时处理了路由缓存逻辑与 UI 渲染，可拆分为：
     - `@keepalive-tabs/core`（纯逻辑 + hooks + context）
     - `@keepalive-tabs/antd`（Ant Design 实现）
   - 这样可支持任意 UI 库（MUI、Arco、Naive、Headless）。

2. **更细粒度缓存策略**
   - 扩展 `RouteInfo.keepAlive` 为对象配置，例如：
     - `max`：最大缓存页面数（LRU）
     - `ttl`：页面缓存有效时长
     - `reuse`：同一路由不同 query 是否复用

3. **可插拔持久化层**
   - 当前仅用 `sessionStorage`，可支持 `localStorage`、IndexedDB、自定义 adapter（如后端同步）。

4. **可观测性与调试能力**
   - 提供调试面板/事件回调：`onTabOpen`、`onTabClose`、`onRestore`，方便埋点与问题排查。

5. **SSR/微前端兼容**
   - 抽离浏览器 API（`window`、`sessionStorage`）访问点，增加 guard，提升 SSR 与 qiankun 场景稳定性。

## 可以扩展的功能

- 多实例命名空间（同一页面多个 KeepAlive 容器互不干扰）。
- 标签组（按业务分组展示 tabs）。
- 受控模式（外部传入 tabs/activeKey 并完全接管状态）。
- 国际化（tab 操作菜单文案可配置）。
- 快捷键支持（切换/关闭 tab）。

## 做成 npm 包：完全可行

建议采用下面结构：

```txt
packages/
  core/            # useKeepAlive + context + types
  react-router/    # 与 React Router 绑定的适配层
  antd/            # 默认 UI（TabsBar + 菜单 + 拖拽）
  demo/            # 示例站点
```

### 最小发布步骤

1. 调整 `package.json`
   - 去掉 `private: true`
   - 增加 `main` / `module` / `types` / `exports`
   - 把 `files` 改为真实产物目录（例如 `dist`）

2. 新增打包流程
   - 推荐 `tsup` 或 `rollup` 产出 ESM + CJS + d.ts

3. 明确 peerDependencies
   - `react`、`react-dom`、`react-router-dom`、`antd`、`@dnd-kit/*`

4. 提供样式策略
   - 默认内置样式（`dist/style.css`）
   - 同时暴露 className/slots 方便自定义

5. 建立发布 CI
   - GitHub Actions：`changeset version` + `changeset publish`

## 使用体验目标（用户视角）

理想情况下，业务方只需要：

```tsx
import { KeepAliveLayout } from 'keepalive-tabs-kit';
import 'keepalive-tabs-kit/style.css';
```

然后在路由中传入 `routeConfig` 即可完成接入。
