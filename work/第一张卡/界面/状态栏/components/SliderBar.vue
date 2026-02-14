<template>
  <div class="slider-box">
    <div class="slider-info">
      <span>{{ label }}</span>
      <span :style="{ color: color2, fontWeight: 'bold' }">{{ value }}</span>
    </div>
    <div class="slider-track">
      <div
        class="slider-fill"
        :style="{
          width: percent + '%',
          background: `linear-gradient(90deg, ${color1}, ${color2})`,
          boxShadow: `0 0 5px ${color1}`,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: number;
  color1: string;
  color2: string;
}>();

const percent = computed(() => {
  const v = parseInt(String(props.value)) || 0;
  return Math.min(100, Math.max(0, v));
});
</script>
