<template>
  <div
    class="btag"
    :class="[`btag--${status}`, dense ? 'btag--dense' : '']"
    :style="{ '--btag-scale': scale }"
    @click="$emit('click')"
  >
    <!-- 头部 -->
    <div class="btag__head">
      <span class="btag__dot"></span>
      <span class="btag__title">{{ title }}</span>
     
    </div>

    <!-- 次标题 -->
    <div v-if="subtitle" class="btag__sub">{{ '值班人员:李心艾' }}</div>

   
    <!-- 放图片 -->
    <div class="btag__pin"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: 'A1号楼' },
  subtitle: { type: String, default: '' },                 // 例如 “3层 | 办公/配电”

  status: { type: String, default: 'normal' },             // normal | warn | danger
  scale: { type: String, default: '1' },                   // 整体缩放，适配大屏
  dense: { type: Boolean, default: false }                 // 紧凑模式
})
</script>

<style scoped>
/* 主题变量 */
.btag{
  --c1:#1d5a8c;                /* 深蓝 */
  --c2:#5299d3;                /* 天蓝 */
  --fg:#d9eeff;                /* 字体浅蓝 */
  --glow: rgba(82,153,211,.55);
  --bd: rgba(82,153,211,.55);
  color: var(--fg);

  position: relative;
  display: inline-block;
  min-width: 70px; max-width: 120px;
  padding: 10px 12px 12px;
  border: 1px solid var(--bd);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(29,90,140,.18), rgba(82,153,211,.10)) padding-box;
  box-shadow: 0 0 10px var(--glow) inset, 0 0 14px rgba(0,0,0,.18);
  backdrop-filter: blur(4px);
  scale: var(--btag-scale);
  user-select: none;
}
.btag--dense{ padding: 8px 10px 10px; min-width: 160px; }


.btag__head{ display:flex; align-items:center; gap:8px; }
.btag__dot{
  width:8px; height:8px; border-radius:50%;
  background: radial-gradient(circle, #8ee7ff, #2aa4f4);
  box-shadow: 0 0 8px #2aa4f4;
}
.btag__title{ font-size:16px; font-weight:600; letter-spacing:.5px; }
.btag__badge{
  margin-left:auto; font-size:12px;
  padding:2px 8px; border-radius:999px;
  border:1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.06);
}

.btag__sub{ margin-top:6px; font-size:12px; color:#bfe6ff; opacity:.9; }
.btag--dense .btag__sub{ margin-top:4px; }


.btag__stat{ display: contents; }
.btag__stat-label{ font-size:12px; color:#cfe8ff; opacity:.85; }
.btag__stat-value{
  font-size:14px; font-weight:700; color:#fff;
  padding:0 6px; border-radius:6px;
  background: rgba(82,153,211,.18);
  border:1px solid rgba(82,153,211,.35);
}


</style>
