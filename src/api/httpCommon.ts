/**
 * HTTP 约定（peach-admin-web 全项目须遵守）：
 * - 所有 axios 实例 baseURL 均指向 **网关**，禁止相对 `/api*` 误打 Vite 端口或微服务 8082/8084。
 * - common：`{VITE_GATEWAY_ORIGIN}/peach-common-service/admin/...`（本文件）
 * - auth：`http.ts` → `peach-auth-service`；job：`httpJob.ts` → `peach-job-service`
 * - 动态 serviceId：`httpGatewayDynamic.ts` → `{origin}/{serviceId}/admin/...`
 * - 环境变量见 `.env.development` / `.env.production`；详表见 `src/api/README.md`
 */
import axios from 'axios'
import JSONbigint from 'json-bigint'
import { buildGatewayServiceBaseUrl, PEACH_COMMON_SERVICE } from '../config/gatewayOrigin'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/** 超出 JS 安全整数范围的 JSON 整型按字符串解析，保留雪花 ID 精度。 */
const jsonParser = JSONbigint({ storeAsString: true })

/** peach-common-service：经网关访问，baseURL = 网关 origin + `/peach-common-service` + 管理 API 前缀。 */
const httpCommon = axios.create({
  baseURL: buildGatewayServiceBaseUrl(PEACH_COMMON_SERVICE),
  timeout: 15000,
  transformResponse: [
    (data) => {
      if (data == null || data === '') {
        return data
      }
      if (typeof data !== 'string') {
        return data
      }
      try {
        return jsonParser.parse(data) as unknown
      } catch {
        return data
      }
    },
  ],
})

setupAuthInterceptors(httpCommon)

export default httpCommon
