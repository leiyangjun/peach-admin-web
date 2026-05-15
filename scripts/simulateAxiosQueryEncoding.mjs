/**
 * 本地快速验证：axios 对 GET params 的序列化结果（与浏览器 Network 中 query 一致）。
 * 用法：node scripts/simulateAxiosQueryEncoding.mjs
 */
import axios from 'axios'

const uri = axios.getUri({
  baseURL: '/api/admin',
  url: '/user/page',
  params: {
    pageNum: 1,
    pageSize: 10,
    searchValue: '测试',
  },
})
console.log(uri)
