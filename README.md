# peach-admin-web

Peach 管理端前端工程，基于 **Vue 3 + Vite + TypeScript + Element Plus + Pinia**，经 **`peach-gateway`** 与后端微服务联调。

## 工程说明

本仓库为 **纯前端 SPA**，通过 Vite 开发服务器代理将浏览器请求转发到本地网关（默认 **8090**），并将路径前缀改写为 Nacos **`serviceId`** 形式（如 `/peach-auth-service`、`/peach-common-service`）。

## 功能说明

- 管理端页面、路由与菜单（含动态路由、`import.meta.glob` 视图加载等）。
- **双 HTTP 客户端**：`src/api/http.ts`（认证相关，`/api` + 管理上下文默认 `/admin` → 网关 → auth）；`src/api/httpCommon.ts`（基础业务，`/api-common` + 同前缀 → common-service），避免路径前缀被错误改写（见 `vite.config.ts` 注释）。前缀与 `VITE_ADMIN_API_PREFIX` / `src/config/adminApiPrefix.ts` 一致。
- 登录态：**Bearer Token** 存 `localStorage.peach_admin_token`，由 axios 拦截器附加。

## 内置菜单与路由对照

在 **菜单管理** 中新增或维护菜单时可对照下表，减少 `route_path`、图标与侧栏/路由不一致。**站内页**的 path 需与 `src/views` 下实际文件一致，并由 `resolveViewLoaderFromInternalPath` 按约定解析（见 `src/utils/viewRouteResolver.ts`）。`frame://`、`openwindow://` 等前缀的语义见 `src/utils/menuRoutePath.ts`。

下列 **route_path** 与 **icon**（Element Plus Icons 组件名，与 `src/constants/menuIconOptions.ts` / `resolveMenuIconComponent` 一致）摘自 `src/config/staticSidebarMenus.ts`；并与 `peach-common-service` 中 `src/main/resources/sql/init_data.sql`（及先执行的 `init_table.sql`）的初始化菜单核对。当前主布局侧栏默认使用该写死树（扁平、无「系统管理」目录节点）；库表种子含 **系统管理**（`CATALOG`）及其子项，path/icon 与下表站内条目一致。

| 菜单名称 | 路由路径 | 图标 |
| --- | --- | --- |
| 首页 | `/dashboard` | House |
| 系统管理（目录，CATALOG） | `/system` | Setting |
| 用户管理（系统管理下） | `/system/user` | User |
| 角色管理（系统管理下） | `/system/role` | Lock |
| 菜单管理 | `/system/menu` | Menu |
| 演示Swagger | `frame://http://127.0.0.1:8090/swagger-ui.html` | Document |
| 新窗口外站 | `openwindow://http://127.0.0.1:8090/index.html` | Link |
| 新窗口站内 | `openwindow://system/menu` | Share |

## 技术栈

- Vue 3、Vue Router 4
- Vite 8
- TypeScript
- Element Plus
- Pinia
- Axios

## 使用说明

### 环境要求

- **Node.js**：建议 **20+**（与 Vite 8 / 工具链兼容）。
- 本地已启动 **`peach-gateway`**（默认 `http://127.0.0.1:8090`，与 `vite.config.ts` 中 `GATEWAY_TARGET` 一致）及所需下游服务。

### 常用命令

```bash
cd peach-admin-web
npm install
npm run dev
npm run build
npm run preview
```

### 开发代理说明

`vite.config.ts` 中：

- **`/api{ADMIN}/...`**（`ADMIN` 默认 **`/admin`**）→ 网关，并重写为 **`/peach-auth-service{ADMIN}/...`**。
- **`/api-common{ADMIN}/...`** → 网关，并重写为 **`/peach-common-service{ADMIN}/...`**。

若修改网关端口，请同步修改 **`GATEWAY_TARGET`**。

### 生产部署

生产环境应在 **Nginx**（或同层网关）将浏览器 **`/api{ADMIN}`**、**`/api-common{ADMIN}`** 转发至同一 Peach 网关入口，并保持与开发环境一致的 **路径前缀语义**（含管理上下文 `ADMIN`，默认 `/admin`）；`npm run build` 产物在 **`dist/`**。

## 开发约定

- TypeScript 严格模式由 `vue-tsc` 在 `npm run build` 时校验。
- 新增调用不同微服务前缀时，**勿**让 `/api` 的通用正则抢先匹配专用前缀（参考现有 `/api-common` 顺序）。

## 构建产物

- 生产构建输出目录：`dist/`（已在 `.gitignore` 中忽略，勿提交）

## 远程仓库与双推送

已配置 `origin` 同时推送 **GitHub** 与 **Gitee**，一次推送即可同步：

```bash
git push -u origin main
```

## 作者

leiyangjun
