<script setup lang="ts">
/**
 * 主内容区嵌入外部网页：地址来自路由 meta.iframeUrl 或查询参数 url（仅开发调试用，生产建议只用 meta）。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const frameSrc = computed(() => {
  const fromMeta = route.meta.iframeUrl
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta.trim()
  }
  const qu = route.query.u
  if (typeof qu === 'string' && qu.trim()) {
    try {
      return decodeURIComponent(qu.trim())
    } catch {
      return qu.trim()
    }
  }
  /** 仅开发环境允许 ?url= 注入 */
  if (import.meta.env.DEV) {
    const q = route.query.url
    if (typeof q === 'string' && q.trim()) {
      return q.trim()
    }
  }
  return ''
})
</script>

<template>
  <div class="iframe-shell">
    <iframe
      v-if="frameSrc"
      :src="frameSrc"
      class="iframe-shell__frame"
      title="embedded"
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <el-empty v-else description="未配置 iframe 地址（meta.iframeUrl）" />
  </div>
</template>

<style scoped>
.iframe-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.iframe-shell__frame {
  flex: 1;
  width: 100%;
  min-height: min(70vh, 720px);
  border: 0;
}
</style>
