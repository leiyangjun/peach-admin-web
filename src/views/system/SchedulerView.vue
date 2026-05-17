<script setup lang="ts">
/**
 * 定时任务列表：布局对齐用户管理；分页查询；独立页编辑。
 */
import {
  Delete,
  Document,
  Edit,
  Plus,
  Promotion,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import { CMN_BUTTON, CMN_BUTTON_LABEL } from '../../constants/cmnButton'
import { useButtonPermission } from '../../composables/useButtonPermission'
import { isInternalJobType } from '../../models/jobTask'
import { isJobTaskPaused, useSchedulerController } from '../../controllers/system/useSchedulerController'
import { formatDateTime } from '../../utils/dateTime'

/** HTTP 状态是否为成功（仅 200 视为成功） */
function isHttpStatusSuccess(status: number | null | undefined): boolean {
  return status === 200
}

const {
  keyword,
  page,
  pageSize,
  total,
  loading,
  tableRows,
  logDrawerVisible,
  logLoading,
  logRows,
  logTitle,
  onSearch,
  onReset,
  goCreate,
  goEdit,
  confirmDelete,
  onPause,
  onResume,
  onTrigger,
  openLogs,
  refreshLogs,
} = useSchedulerController()

const { hasButton } = useButtonPermission()
</script>

<template>
  <div class="scheduler-page">
    <el-card shadow="never" class="page-list-card">
      <div class="page-list-toolbar">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="keyword"
              clearable
              placeholder="任务名称 / 描述"
              style="width: 260px"
              @keyup.enter="onSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button v-if="hasButton(CMN_BUTTON.QUERY)" type="primary" @click="onSearch">{{ CMN_BUTTON_LABEL[CMN_BUTTON.QUERY] }}</el-button>
            <el-button v-if="hasButton(CMN_BUTTON.RESET)" @click="onReset">{{ CMN_BUTTON_LABEL[CMN_BUTTON.RESET] }}</el-button>
          </el-form-item>
          <el-form-item v-if="hasButton(CMN_BUTTON.ADD)" class="right-btn">
            <el-button type="success" :icon="Plus" @click="goCreate">{{ CMN_BUTTON_LABEL[CMN_BUTTON.ADD] }}</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" class="page-list-table" :data="tableRows" row-key="id" stripe>
        <el-table-column
          type="index"
          label="#"
          width="56"
          :index="(i: number) => (page - 1) * pageSize + i + 1"
        />
        <el-table-column prop="jobName" label="名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="jobDescription" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="isInternalJobType(row.jobType) ? 'info' : 'warning'">
              {{ isInternalJobType(row.jobType) ? '内部' : '外部' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="jobCronExpression" label="Cron" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="88" align="center">
          <template #default="{ row }">
            <el-tag :type="row.valid === 1 ? 'success' : 'info'" size="small">
              {{ row.valid === 1 ? '运行中' : '已暂停' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="serviceName" label="服务" width="140" show-overflow-tooltip />
        <el-table-column prop="externalBaseUrl" label="外呼基址" min-width="140" show-overflow-tooltip />
        <el-table-column prop="urlPath" label="路径" min-width="200" show-overflow-tooltip />
        <el-table-column prop="retryMax" label="最大重试" width="100" align="center" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <span class="scheduler-table-ops">
              <el-tooltip v-if="hasButton(CMN_BUTTON.EDIT)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.EDIT]" placement="top">
                <el-button type="primary" link :icon="Edit" @click="goEdit(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.LOG)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.LOG]" placement="top">
                <el-button type="primary" link :icon="Document" @click="openLogs(row)" />
              </el-tooltip>
              <el-tooltip v-if="!isJobTaskPaused(row) && hasButton(CMN_BUTTON.PAUSE)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.PAUSE]" placement="top">
                <el-button type="warning" link :icon="VideoPause" @click="onPause(row)" />
              </el-tooltip>
              <el-tooltip v-else-if="isJobTaskPaused(row) && hasButton(CMN_BUTTON.RESUME)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.RESUME]" placement="top">
                <el-button type="success" link :icon="VideoPlay" @click="onResume(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.TRIGGER)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.TRIGGER]" placement="top">
                <el-button type="primary" link :icon="Promotion" @click="onTrigger(row)" />
              </el-tooltip>
              <el-tooltip v-if="hasButton(CMN_BUTTON.DELETE)" :content="CMN_BUTTON_LABEL[CMN_BUTTON.DELETE]" placement="top">
                <el-button type="danger" link :icon="Delete" @click="confirmDelete(row)" />
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager page-list-pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </el-card>

    <el-drawer v-model="logDrawerVisible" :title="logTitle" size="min(900px, 96vw)" destroy-on-close>
      <el-table v-loading="logLoading" :data="logRows" border size="small" max-height="calc(100vh - 220px)">
        <el-table-column type="index" label="次序" width="70" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="isHttpStatusSuccess(row.httpstatus) ? 'success' : 'danger'"
            >
              {{ row.httpstatus ?? '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="exeTime" label="耗时(ms)" width="100" />
        <el-table-column prop="responseMsg" label="信息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="jobApi" label="API" width="160" show-overflow-tooltip />
      </el-table>
      <div class="drawer-footer">
        <el-button v-if="hasButton(CMN_BUTTON.REFRESH)" type="primary" @click="refreshLogs">{{ CMN_BUTTON_LABEL[CMN_BUTTON.REFRESH] }}</el-button>
        <el-button v-if="hasButton(CMN_BUTTON.CANCEL)" @click="logDrawerVisible = false">{{ CMN_BUTTON_LABEL[CMN_BUTTON.CANCEL] }}</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.scheduler-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.page-list-card :deep(.el-card__body) {
  padding: 0;
}

.page-list-toolbar {
  padding: 10px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-table-header-bg-color);
}

.page-list-toolbar :deep(.el-form) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 10px;
  column-gap: 12px;
  width: 100%;
}

.page-list-toolbar :deep(.el-form-item) {
  margin-bottom: 0;
}

.right-btn {
  margin-left: auto;
}

.page-list-table :deep(.el-table) {
  border-radius: 0 0 8px 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
}

.page-list-pager {
  padding: 14px 16px 16px;
}

.scheduler-table-ops {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.drawer-footer {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
