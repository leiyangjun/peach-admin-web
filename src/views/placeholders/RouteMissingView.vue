<script setup lang="ts">
/**
 * 动态路由未找到对应视图文件时的占位页（菜单 path 与 views 目录约定不一致）。
 */
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="route-missing">
    <el-result icon="warning" title="页面未配置" sub-title="未找到与该路由匹配的视图文件，请检查菜单路由与 src/views 下文件路径是否一致。">
      <template #extra>
        <p class="hint">当前路径：<code>{{ route.path }}</code></p>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.route-missing {
  padding: 24px 16px;
}
.hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
code {
  font-size: 12px;
}
</style>
