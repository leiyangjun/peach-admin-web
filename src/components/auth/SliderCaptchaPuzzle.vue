<script setup lang="ts">
/**
 * 滑块验证：封装 vue3-slide-verify。
 * 后端下发 targetX 作为组件 offset（缺口横坐标）；用户拖好后 success 返回的 left 即 sliderOffset。
 */
import SlideVerify from 'vue3-slide-verify'
import 'vue3-slide-verify/dist/style.css'
import { watch } from 'vue'
import type { SliderChallenge } from '../../models/auth'
import captchaImg from '../../assets/slider-captcha-bg.svg?url'

const props = defineProps<{
  challenge: SliderChallenge | null
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

/** 登录提交的 sliderOffset（拼图块最终 left，px） */
const model = defineModel<number>({ default: 0 })

/** 与后端 SliderCaptchaService、vue3-slide-verify 几何一致：l=42、r=10 → L=65 */
const PUZZLE_L = 42
const PUZZLE_R = 10
const CANVAS_H = 155

/** 背景图列表（单图也可；避免默认外链随机图过慢） */
const captchaImgs = [captchaImg]

watch(
  () => props.challenge?.captchaId,
  () => {
    model.value = 0
  },
)

function onSuccess(detail: { timestamp: number; left: number }) {
  model.value = Math.round(detail.left)
}

function onFail() {
  model.value = 0
}

/** 疑似机器拖动：重新拉挑战 */
function onAgain() {
  model.value = 0
  emit('refresh')
}

/** 用户点击组件内刷新图标 */
function onSlideRefresh() {
  model.value = 0
  emit('refresh')
}
</script>

<template>
  <div class="slider-captcha">
    <div class="slider-captcha__head">
      <span class="slider-captcha__title">安全验证</span>
    </div>

    <div v-loading="loading" class="slider-captcha__panel">
      <div v-if="!challenge && !loading" class="slider-captcha__placeholder">
        正在加载验证…
      </div>

      <SlideVerify
        v-else-if="challenge"
        :key="challenge.captchaId"
        class="slider-captcha__verify"
        :w="challenge.canvasWidth"
        :h="CANVAS_H"
        :l="PUZZLE_L"
        :r="PUZZLE_R"
        :accuracy="6"
        :interval="50"
        :offset="challenge.targetX"
        :imgs="captchaImgs"
        slider-text="向右滑动完成验证"
        :show="true"
        @success="onSuccess"
        @fail="onFail"
        @again="onAgain"
        @refresh="onSlideRefresh"
      />
    </div>
  </div>
</template>

<style scoped>
.slider-captcha {
  max-width: 100%;
}

.slider-captcha__head {
  margin-bottom: 8px;
}

.slider-captcha__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.slider-captcha__panel {
  position: relative;
  border-radius: 8px;
  /* 去掉双层边框感：不再描边，仅靠登录卡片承载层次 */
  border: none;
  overflow: hidden;
  background: transparent;
  /* 与拼图、滑轨贴紧；库内滑轨自带 margin-top，此处不再额外垫厚 */
  padding: 2px 0 4px;
  display: flex;
  justify-content: center;
}

.slider-captcha__placeholder {
  min-height: 220px;
  width: 100%;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

.slider-captcha__verify {
  max-width: 100%;
}

/* 缩小验证码在外壳内的横向溢出（窄屏） */
.slider-captcha__panel :deep(#slideVerify) {
  max-width: 100%;
}

/* 库默认 .slide-verify-slider { margin-top: 15px }，缩成与上图一行间距 */
.slider-captcha__panel :deep(.slide-verify-slider) {
  margin-top: 6px;
}

/* 拼图区与容器齐平，避免视觉再缩一圈 */
.slider-captcha__panel :deep(.slide-verify) {
  margin: 0;
}
</style>
