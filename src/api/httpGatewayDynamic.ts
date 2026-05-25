import axios from 'axios'
import JSONbigint from 'json-bigint'
import { resolveGatewayDynamicBaseUrl } from '../config/gatewayOrigin'
import { setupAuthInterceptors } from './setupAuthInterceptors'

/** 超出 JS 安全整数范围的 JSON 整型按字符串解析，保留雪花 ID 精度。 */
const jsonParser = JSONbigint({ storeAsString: true })

/**
 * 经网关访问各微服务（URL 以 `/{serviceId}` 开头）。
 * baseURL 为 {@link resolveGatewayDynamicBaseUrl}，开发默认 `http://127.0.0.1:8090`。
 */
const httpGatewayDynamic = axios.create({
  baseURL: resolveGatewayDynamicBaseUrl(),
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
