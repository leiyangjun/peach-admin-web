import axios from 'axios'
import JSONbigint from 'json-bigint'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/** 超出 JS 安全整数范围的 JSON 整型按字符串解析，保留雪花 ID 精度。 */
const jsonParser = JSONbigint({ storeAsString: true })

/**
 * peach-common-service 的 Axios 实例：baseURL 为 `/api-common` + 管理 API 前缀。
 * 认证服务使用 {@link ./http}；开发代理顺序见 vite.config（`/api-common` 须在 `/api` 之前）。
 */
const httpCommon = axios.create({
  baseURL: `/api-common${ADMIN_API_PATH_PREFIX}`,
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
