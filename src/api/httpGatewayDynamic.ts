import axios from 'axios'
import JSONbigint from 'json-bigint'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/** 超出 JS 安全整数范围的 JSON 整型按字符串解析，保留雪花 ID 精度。 */
const jsonParser = JSONbigint({ storeAsString: true })

/**
 * 直连网关上的各微服务管理端路径（URL 以 `/` + serviceId 开头，不经 `/api-common` 改写）。
 * 开发环境依赖 vite 将 `/peach-*` 代理到本地网关，见 vite.config.ts。
 */
const httpGatewayDynamic = axios.create({
  baseURL: '',
  timeout: 30000,
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

setupAuthInterceptors(httpGatewayDynamic)

export default httpGatewayDynamic
