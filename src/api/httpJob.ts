import axios from 'axios'
import JSONbigint from 'json-bigint'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { normalizeAxiosParamsEncoding } from '../utils/queryParamEncoding'
import { rejectAxiosResponse } from './axiosResponseHandler'

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

httpJob.interceptors.request.use((config) => {
  normalizeAxiosParamsEncoding(config.params)
  const token = localStorage.getItem('peach_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpJob.interceptors.response.use(
  (response) => response,
  (error) => rejectAxiosResponse(error),
)

export default httpJob
