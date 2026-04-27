<script setup lang="ts">
const cards = [
  { title: '在线用户', value: '1,286', trend: '+12.6%', color: '#3b82f6' },
  { title: '今日请求', value: '92,410', trend: '+8.2%', color: '#10b981' },
  { title: '网关路由', value: '36', trend: '+3', color: '#f59e0b' },
  { title: '系统告警', value: '2', trend: '-1', color: '#ef4444' },
]
</script>

<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col v-for="item in cards" :key="item.title" :xs="24" :sm="12" :lg="6">
        <el-card class="metric-card" shadow="hover">
          <div class="label">{{ item.title }}</div>
          <div class="value">{{ item.value }}</div>
          <div class="trend" :style="{ color: item.color }">{{ item.trend }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never">
          <template #header>
            <span>系统公告</span>
          </template>
          <el-timeline>
            <el-timeline-item timestamp="2026-04-21">新增 Peach 网关管理后台模板。</el-timeline-item>
            <el-timeline-item timestamp="2026-04-20">接入 Nacos 服务发现与 Redis 自定义路由。</el-timeline-item>
            <el-timeline-item timestamp="2026-04-19">统一依赖 BOM 发布流程完善。</el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8" class="mt-mobile">
        <el-card shadow="never" class="quick-card">
          <template #header>
            <span>快捷入口</span>
          </template>
          <el-space direction="vertical" fill>
            <el-button type="primary" plain>新增路由配置</el-button>
            <el-button type="success" plain>查看接口聚合文档</el-button>
            <el-button type="warning" plain>查看网关运行日志</el-button>
          </el-space>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.metric-card {
  border-radius: 14px;
}

.label {
  color: #7b8aa9;
  font-size: 13px;
}

.value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #213158;
}

.trend {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
}

.mt16 {
  margin-top: 16px;
}

.quick-card :deep(.el-button) {
  justify-content: flex-start;
}

@media (max-width: 1199px) {
  .mt-mobile {
    margin-top: 16px;
  }
}
</style>
