<script setup lang="ts">
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import UiButton from '@/components/ui/UiButton.vue'

defineEmits<{ reset: [] }>()

const ui = useUI()
const settings = useSettings()
</script>

<template>
  <div class="view-ctl">
    <UiButton
      size="sm"
      title="相机跟随当前事件自动飞行"
      sfx="click"
      :active="ui.camMode === 'follow'"
      @click="ui.camMode = 'follow'"
    >跟随</UiButton>
    <UiButton
      size="sm"
      title="自己转动地球，相机不动"
      sfx="click"
      :active="ui.camMode === 'free'"
      @click="ui.camMode = 'free'"
    >自由</UiButton>
    <UiButton
      size="sm"
      title="只显示当前时代活跃国家的边界"
      sfx="tick"
      :active="settings.borderDensity === 'era'"
      @click="settings.setBorderDensity('era')"
    >边界·时代</UiButton>
    <UiButton
      size="sm"
      title="显示全部国家边界（高精度）"
      sfx="tick"
      :active="settings.borderDensity === 'full'"
      @click="settings.setBorderDensity('full')"
    >边界·全部</UiButton>
    <UiButton
      size="sm"
      title="显示 / 隐藏地点标签"
      sfx="tick"
      :active="settings.showLabels"
      @click="settings.setShowLabels(!settings.showLabels)"
    >标签</UiButton>
    <UiButton
      size="sm"
      title="显示 / 隐藏分类图例"
      sfx="tick"
      :active="ui.showLegend"
      @click="ui.toggleLegend()"
    >图例</UiButton>
    <UiButton size="sm" title="回到全球视角" sfx="whoosh" @click="$emit('reset')">复位</UiButton>
  </div>
</template>
