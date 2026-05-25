# API / HTTP 访问约定

**原则：前端所有接口均经 peach-gateway，禁止直连微服务端口（8082、8084 等）。**

## Axios 实例

| 文件 | 用途 | baseURL 形态 |
| --- | --- | --- |
| `http.ts` | 认证 auth | `{origin}/peach-auth-service/admin` |
| `httpCommon.ts` | 基础业务 common | `{origin}/peach-common-service/admin` |
| `httpJob.ts` | 定时任务 job | `{origin}/peach-job-service/admin` |
| `httpGatewayDynamic.ts` | 动态 serviceId | `{origin}` 或生产同源 `/` |

`{origin}` 由 `src/config/gatewayOrigin.ts` 的 `VITE_GATEWAY_ORIGIN` 解析；开发默认 `http://127.0.0.1:8090`。

## 浏览器前缀与网关路径对照

| 历史/文档前缀（勿再作 axios baseURL） | 网关实际路径 |
| --- | --- |
| `/api/admin/...` | `/peach-auth-service/admin/...` |
| `/api-common/admin/...` | `/peach-common-service/admin/...` |
| `/api-job/admin/...` | `/peach-job-service/admin/...` |
| `/{serviceId}/admin/...` | 网关同路径（StripPrefix 后下游收 `/admin/...`） |

## 环境变量

- `VITE_GATEWAY_ORIGIN`：网关 HTTP 根地址（开发建议 `http://127.0.0.1:8090`）
- `VITE_ADMIN_API_PREFIX`：管理 API 上下文，默认 `/admin`，须与后端一致

令牌刷新（`tokenRefresh.ts`）同样走 `buildGatewayServiceBaseUrl(peach-auth-service)`，不使用 `/api` 相对路径。
