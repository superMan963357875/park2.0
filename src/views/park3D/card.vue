<template>
    <div class="alarm-modal">
      <div class="modal-header">
        <h3>报警</h3>
        <button class="close-btn" @click="onClose" >✕</button>
      </div>
      <div class="modal-body">
        <div class="row"><span>设备类型：</span><span>{{ item.title ||'报警' }}</span></div>
        <div class="row"><span>告警位置：</span><span>{{ item.position||'幸福佳苑1栋' }}</span></div>
        <div class="row"><span>任务状态: </span><span>{{ item.status ||'正在处理'}}</span></div>
        <div class="row"><span>图片: </span><img :src="item.url" alt="无图" style="width:100px;height:100px" @click="showPreview = true"></div>
      </div>
      <!-- <video src="/Videos/十字路口的车流.mp4" width="100%" height="200px"     controls
      autoplay
      muted
      loop
      playsinline>
        
      </video> -->
    </div>
  <div v-if="showPreview" class="overlay" @click="showPreview = false">
    <img :src="item.url" class="preview-img" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
const props = defineProps<{
  item
}>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();
 function onClose() {
  emit('close');
} 
const showPreview = ref(false)
</script>

<style scoped>
.alarm-modal {
  width: 580px;
  position: absolute;
  top: 50%;
  left: 40%;
  transform: translate(-50%, -50%);
  border-radius: 8px;
 
  background:rgba(28, 40, 58, 0.5);
  box-shadow: 0 4px 12px rgba(12, 12, 12, 0.15);
 
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;

}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  color: #fff;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 16px;
}

.row {
  display: flex;
  margin-bottom: 12px;
  line-height: 1.5;
  font-size: 1.8rem;
  color: #fff;
}

.row .label {
 
  min-width: 60px;
  margin-right: 8px;
}

.row .value {
  color: #333;
  flex: 1;
  font-size:34px;
  word-break: break-word;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
}

.modal-footer button {
  padding: 6px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-footer button:hover {
  background-color: #0069d9;
}

/* 添加动画效果 */
.alarm-modal {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
.thumb {
  width: 100px;
  height: 100px;
  object-fit: cover;
  cursor: pointer;
}

/* 全屏半透明背景 */
.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* 预览图片最大占满视口90% */
.preview-img {
  max-width: 90%;
  max-height: 90%;
  box-shadow: 0 0 8px rgba(0,0,0,0.5);
  border-radius: 4px;
}
</style>