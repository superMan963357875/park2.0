<template>
  <div class="layers" :style="styles">
    <div
      class="layer"
      v-for="row in layers"
      :key="row + '-layer'"
      :class="{ active: active === row }"
      @click="handleClick(row)"
    >
      {{ row }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  active: {
    type: String,
    default: '全楼'
  },
  // 外层定位/尺寸仍可通过 props 注入
  styles: {
    type: Object,
    default: () => ({
      top: '-48%',
      left: '1%',
      height: '400px'
    })
  }
})

const emit = defineEmits(['change'])
const layers = ['全楼','1楼','2楼','3楼']


function handleClick(label) {
  emit('change', label)
}
</script>

<style scoped>

.layers {
  position: fixed;
  top: 50%;
  left: 80%;
  width: 60px;
  height: 400px;
  border: 1px solid #5299d3;
  overflow: auto;
  font-size: 18px;
}


.layers::-webkit-scrollbar {
  width: 0 !important;
  display: none;
}


.layer {
  width: 100%;
  height: 36px;
  margin-bottom: 8px;
  text-align: center;
  line-height: 40px;
  color: #fff;
  border: 2px solid transparent;
  cursor: pointer;
}

.active {
  background: linear-gradient(
    90deg,
    rgba(48, 122, 182, 0) 0%,
    #1d5a8c 31%,
    #5299d3 54%,
    #1d5a8c 76%,
    rgba(29, 90, 140, 0) 100%
  );
  border: 2px solid;
  border-image: linear-gradient(
      90deg,
      rgba(179, 233, 255, 0),
      rgba(150, 219, 255, 1),
      rgba(124, 207, 255, 0)
    )
    2 2;
}
</style>
