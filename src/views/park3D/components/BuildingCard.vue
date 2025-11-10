<template>
  <div
    class="btag"
    :class="[`btag--${status}`, dense ? 'btag--dense' : '']"
    :style="{ '--btag-scale': scale }"
    @click="$emit('click')"
  >
    <button
      v-if="closable"
      class="btag__close"
      aria-label="close"
      @click.stop="closeFn"
      title="关闭"
    >
      ×
    </button>
    <!-- 头部 -->
    <div class="btag__head">
      <span class="btag__indicator"></span>
      <span class="btag__title" >{{alertFlag ? '告警信息' : title  }}</span>
    </div>

    <!-- 信息区 -->
    <div class="btag__body">
      <div v-for="(item, i) in items" :key="i" class="btag__row">
        <div class="btag__label">{{ item.label }}：</div>
        <div class="btag__value" :class="valueClass(item)">
          <span v-if="item.value"> {{ item.value }}</span>
          <img v-if="item.url" :src="item.url" alt="" style="width: 120px" />
        </div>
      </div>
      <img src="" alt="" />
    </div>

    <!-- 右下设备开关区域 -->
    <img v-if="videoFlag" src="" alt="" />
    <div v-if="lightOn || doorFlag || BarrierFlag">
      <div class="btag__head">
        <span class="btag__indicator"></span>
        <span class="btag__title">设备开关</span>
      </div>

      <div class="btag__bottom" v-if="lightOn">
        <button class="btag-btn btag-btn--on" @click="change(name, true)">
          开
        </button>
        <button class="btag-btn btag-btn--off" @click="change(name, false)">
          关
        </button>
      </div>
       <div class="btag__bottom" v-else-if="BarrierFlag">
        <button class="btag-btn btag-btn--on" @click="changeBuilding(name, true)">
          开
        </button>
        <button class="btag-btn btag-btn--off" @click="changeBuilding(name, false)">
          关
        </button>
      </div>
      <div class="btag__bottom" v-else>
        <button class="btag-btn btag-btn--on" @click="changeDoor(name, true)">
          开
        </button>
        <button class="btag-btn btag-btn--off" @click="changeDoor(name, false)">
          关
        </button>
      </div>
    </div>

    <!-- 告警处理区域 -->
    <div v-if="alertFlag">
      <div class="btag__head">
        <span class="btag__indicator btag__indicator--alert"></span>
        <span class="btag__title">告警处理</span>
      </div>

      <div class="btag__bottom btag__bottom--alert">
        <button class="btag-btn btag-btn--alert" @click="handleAlert(name)">
          处理
        </button>
      </div>
    </div>
    <errorCard v-if="alertFlag1" @close="close" @closeFn="closeFn"/>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import { switchLight, changeDoorFn, to3D,changeBuildingFn } from '../threeJs/index';
import { removeCurrentTag } from '../threeJs/iconMarkers.js';
import errorCard from '../errorCard.vue';
type Item = {
  label: string;
  value: string | number;
  type?: 'normal' | 'ok' | 'warn' | 'error' | 'muted';
};

const props = withDefaults(
  defineProps<{
    title: string;
    name: string;
    items: Item[];
    badge?: string;
    status?: 'default' | 'ok' | 'warn' | 'error';
    dense?: boolean;
    scale?: number | string;
    lightOn?: boolean;
    doorFlag?: boolean;
    videoFlag?: boolean;
    alertFlag?: boolean; // 新增：是否显示告警处理
    closable?: boolean;
    BarrierFlag?:boolean
  }>(),
  {
    status: 'default',
    dense: false,
    scale: 1,
    closable: true,
    alertFlag: false // 默认不显示告警
  }
);
const alertFlag1=ref(false)
const valueClass = (item: Item) => {
  switch (item.type) {
    case 'ok':
      return 'is-ok';
    case 'warn':
      return 'is-warn';
    case 'error':
      return 'is-error';
    case 'muted':
      return 'is-muted';
    default:
      return '';
  }
};

function change(name: string, flag: boolean) {
  console.log('change', name, flag);
  switchLight(name, flag);
}

function changeDoor(name: string, flag: boolean) {
  changeDoorFn();
}
function changeBuilding(){
changeBuildingFn()
}
function closeFn() {
  to3D();
  removeCurrentTag();
  close()
}
function close (){
   alertFlag1.value=false
}
// 新增：告警处理方法
function handleAlert(name) {
 alertFlag1.value=true
}
</script>

<style scoped>
.btag {
  --panel-bg: rgba(12, 16, 24, 0.72);
  --panel-border: rgba(120, 144, 180, 0.24);
  --title: #dbe7ff;
  --label: #8fa3be;
  --value: #e9f0ff;
  --ok: #2dd4bf;
  --warn: #f59e0b;
  --error: #ff6b6b;
  --alert: #ff4757; /* 新增：告警颜色 */
  --badge-bg: rgba(80, 160, 255, 0.18);

  transform: scale(var(--btag-scale));
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(2px);
  width: 360px;
}

.btag__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(120, 144, 180, 0.18);
  background: linear-gradient(
    180deg,
    rgba(34, 48, 72, 0.55),
    rgba(34, 48, 72, 0)
  );
  position: relative;
}

.btag__indicator {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: linear-gradient(135deg, #3ad0ff, #2a7fff);
  box-shadow: 0 0 12px rgba(58, 208, 255, 0.65);
}

/* 告警指示器样式 */
.btag__indicator--alert {
  background: linear-gradient(135deg, #ff4757, #ff3742);
  box-shadow: 0 0 12px rgba(255, 71, 87, 0.65);
  animation: alertPulse 2s infinite;
}

@keyframes alertPulse {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(255, 71, 87, 0.65);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 71, 87, 0.9);
  }
}

.btag__title {
  color: var(--title);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.btag__body {
  padding: 10px 14px 12px 14px;
  display: grid;
  row-gap: 8px;
}

.btag__row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  align-items: center;
}

.btag__label {
  color: var(--label);
  font-size: 22px;
  white-space: nowrap;
  opacity: 0.9;
}

.btag__value {
  color: var(--value);
  font-weight: 600;
  justify-self: end;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.btag__value.is-ok {
  color: var(--ok);
}

.btag__value.is-warn {
  color: var(--warn);
}

.btag__value.is-error {
  color: var(--error);
}

.btag__value.is-muted {
  opacity: 0.6;
}

/* 角标 */
.btag__badge {
  position: absolute;
  top: 1px;
  right: 10px;
  padding: 2px 8px;
  font-size: 22px;
  color: #98c1ff;
  background: var(--badge-bg);
  border: 1px solid rgba(120, 170, 255, 0.25);
  border-radius: 999px;
  backdrop-filter: blur(2px);
}

/* 稠密模式 */
.btag--dense .btag__body {
  row-gap: 6px;
  padding-top: 8px;
  padding-bottom: 10px;
}

.btag--dense .btag__label {
  font-size: 11px;
}

.btag--dense .btag__value {
  font-size: 12px;
}

/* 状态主题 */
.btag--ok {
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.18), 0 8px 24px rgba(0, 0, 0, 0.35);
}

.btag--warn {
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.18), 0 8px 24px rgba(0, 0, 0, 0.35);
}

.btag--error {
  box-shadow: 0 0 0 1px rgba(255, 107, 107, 0.18),
    0 8px 24px rgba(0, 0, 0, 0.35);
}

/* 告警状态主题 */
.btag--alert {
  box-shadow: 0 0 0 1px rgba(255, 71, 87, 0.18), 0 8px 24px rgba(0, 0, 0, 0.35);
}

.btag__bottom {
  display: flex;
  gap: 10px;
  padding: 10px 14px 14px;
}

/* 告警底部区域 */
.btag__bottom--alert {
  justify-content: center;
  padding: 12px 14px 16px;
}

.btag-btn {
  flex: 1;
  height: 32px;
  border-radius: 999px;
  border: 1px solid rgba(173, 211, 255, 0.35);
  background: transparent;
  color: #e9f3ff;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease,
    border-color 0.2s ease;
}

.btag-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(64, 140, 255, 0.25);
}

.btag-btn:active {
  transform: translateY(0);
}

/* 告警按钮样式 */
.btag-btn--alert {
  flex: none;
  min-width: 120px;
  height: 36px;
  background: linear-gradient(135deg, #ff4757, #ff3742);
  border: 1px solid rgba(255, 71, 87, 0.4);
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
}

.btag-btn--alert:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 71, 87, 0.4);
  background: linear-gradient(135deg, #ff5a6b, #ff4757);
}

.btag-btn--alert:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
}

.btag__close {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #cfe6ff;
  font-size: 18px;
  line-height: 26px;
  text-align: center;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
  z-index: 5;
}

.btag__close:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 6px 14px rgba(64, 140, 255, 0.12);
}

.btag__close:active {
  transform: translateY(0);
}

/* 如果 badge 与 close 同时存在，确保布局不冲突 */
.btag__badge {
  position: absolute;
  top: 36px;
  right: 10px;
  padding: 2px 8px;
  font-size: 22px;
  color: #98c1ff;
  background: var(--badge-bg);
  border: 1px solid rgba(120, 170, 255, 0.25);
  border-radius: 999px;
  backdrop-filter: blur(2px);
  z-index: 4;
}
</style>
