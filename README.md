# peach-admin-web

Peach 管理端前端工程，基于 **Vue 3 + Vite + TypeScript + Element Plus + Pinia**，经 **`peach-gateway`** 与后端微服务联调。

## 工程说明

本仓库为 **纯前端 SPA**，通过 Vite 开发服务器代理将浏览器请求转发到本地网关（默认 **8090**），并将路径前缀改写为 Nacos **`serviceId`** 形式（如 `/peach-auth-service`、`/peach-common-service`）。

## 功能说明

- 管理端页面、路由与菜单（含动态路由、`import.meta.glob` 视图加载等）。
- **双 HTTP 客户端**：`src/api/http.ts`（认证相关，`/api` → 网关 → auth）；`src/api/httpCommon.ts`（基础业务，`/api-common` → common-service），避免路径前缀被错误改写（见 `vite.config.ts` 注释）。
- 登录态：**Bearer Token** 存 `localStorage.peach_admin_token`，由 axios 拦截器附加。

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

- **`/api`** → 网关，并重写为 **`/peach-auth-service`** 前缀。
- **`/api-common`** → 网关，并重写为 **`/peach-common-service`** 前缀。

若修改网关端口，请同步修改 **`GATEWAY_TARGET`**。

### 生产部署

生产环境应在 **Nginx**（或同层网关）将浏览器 **`/api`**、**`/api-common`** 转发至同一 Peach 网关入口，并保持与开发环境一致的 **路径前缀语义**；`npm run build` 产物在 **`dist/`**。

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
