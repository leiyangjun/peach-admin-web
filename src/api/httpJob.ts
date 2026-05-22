import axios from 'axios'
import JSONbigint from 'json-bigint'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { setupAuthInterceptors } from './setupAuthInterceptors'

const jsonParser = JSONbigint({ storeAsString: true })

/**
 * peach-job-service 的 Axios 实例：baseURL 为 `/api-job` + 管理 API 前缀。
 * 开发代理见 vite.config（`/api-job` 规则须在 `/api` 之前）。
 */
const httpJob = axios.create({
  baseURL: `/api-job${ADMIN_API_PATH_PREFIX}`,
  timeout: 20000,
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

setupAuthInterceptors(httpJob)

export default httpJob
