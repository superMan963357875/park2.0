<template>
  <div>
    <div class="workplace-background">
    </div>
  </div>
</template>
<style lang="scss" scoped>
.workplace-background {
  min-height: calc(100vh - var(--el-header-height, 60px)); // 减去头部高度（如有）
  width: 100%;
  background: url("@/assets/imgs/temp/0e26f171ad01d8cbb842546419b483db.jpg") no-repeat center center / cover;
  position: relative;

  // 可选：添加暗色遮罩，提升文字对比度
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.4));
    pointer-events: none; // 不阻挡点击事件
    z-index: 1;
  }
}

.workplace-wrapper {
  position: relative;
  z-index: 2; // 确保内容在背景之上
  padding: 20px;
  backdrop-filter: blur(2px); // 可选：轻微模糊背景，增强阅读体验
}
</style>
<script setup lang="ts">
</script>
