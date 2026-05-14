import axios from 'axios'
import JSONbigint from 'json-bigint'
import { ADMIN_API_PATH_PREFIX } from '../config/adminApiPrefix'
import { rejectAxiosResponse } from './axiosResponseHandler'

/** 超越 Number.MAX_SAFE_INTEGER 的整型在 JSON 中按字符串保留，避免雪花 ID 被截断。 */
const jsonParser = JSONbigint({ storeAsString: true })

/**
 * 指向 peach-common-service（经网关 `/peach-common-service` + 管理上下文前缀）。
 * 与 {@link ./http}（认证服务）区分，避免混用路径前缀。
 *
 * 开发代理注意：浏览器请求为「/api-common + 管理前缀 + 业务路径」，勿让「/api」规则抢先改写「/api-common」；
 * 见 vite.config 中代理顺序与 rewrite。
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

httpCommon.interceptors.request.use((config) => {
  const token = localStorage.getItem('peach_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpCommon.interceptors.response.use(
  (response) => response,
  (error) => rejectAxiosResponse(error),
)

export default httpCommon
