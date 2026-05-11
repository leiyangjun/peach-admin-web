import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 嵌入页地址，供 IframeShellView 使用 */
    iframeUrl?: string
  }
}
