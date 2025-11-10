<template>
  <transition name="modal">
    <div  class="select-modal">
      <div class="alarm-modal">
   
        <div class="modal-header">
          <h3>处理</h3>
          <span class="close-btn" @click="workerDetail">✕</span>
        </div>
        <div class="modal-body">
          <div class="row">
            <span>确认状态：</span>
            <span>已确认</span>
          </div>

          <div class="row">
            <span>选择处理人员：</span>
            <span></span>
          </div>
          <div class="transfer-container">
            <!-- 左侧： -->
            <div class="panel left">
              <h4>所属部门</h4>
              <div
                v-for="(people, dept) in availableGrouped"
                :key="dept"
                class="dept-group"
              >
                <div class="dept-header">{{ dept }}</div>
                <div v-for="p in people" :key="p.id" class="person-row">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(p.id)"
                    @change="toggle(p)"
                  />
                  <span class="name">{{ p.name }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：已选列表 -->
            <div class="panel right">
              <h4>已选（{{ selectedList.length }}）</h4>
              <div v-for="p in selectedList" :key="p.id" class="selected-row">
                <span>{{ p.name }} {{ p.phone }}</span>
                <button class="remove-btn" @click="toggle(p)">✕</button>
              </div>
            </div>
          </div>
        </div>

   
        <div class="modal-footer">
          <el-button type="primary" size="large" style="font-size: 25px" @click="handleSelect">
            确定
          </el-button>
        </div>
      </div>
    </div>
  </transition>  
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus'
const emit = defineEmits<{
  (e: 'close'): void
}>();
const allPeople = ref([
  { id: 1, name: '余仁君', phone: '13245678909', dept: '安保部' },
  { id: 2, name: '付维非', phone: '138xxxxxxx', dept: '安保部' },
  { id: 3, name: '赵坤', phone: '139xxxxxxx', dept: '安保部' },
  { id: 4, name: '刘凯', phone: '136xxxxxxx', dept: '管理部' },
  { id: 5, name: '杨善德', phone: '137xxxxxxx', dept: '综合行政部' }
]);
const complete = ref(false);
// 存储已选 id
const selectedIds = ref([]);
const selectedList = computed(() =>
  allPeople.value.filter((p) => selectedIds.value.includes(p.id))
);
const showDetail = ref(false);
const detail = ref({});
const showDetail1 = ref(false);
// 计算：左侧未选并按 dept 分组
const availableGrouped = computed(() => {
  const groups = {};
  allPeople.value
    .filter((p) => !selectedIds.value.includes(p.id))
    .forEach((p) => {
      if (!groups[p.dept]) groups[p.dept] = [];
      groups[p.dept].push(p);
    });
  return groups;
});
const handleClick = () => {};
// 切换选中/取消
function toggle(p) {
  const idx = selectedIds.value.indexOf(p.id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(p.id);
}
function handleDispose(item) {
  if (item.status == '已处理') {
    detail.value = item;
    complete.value = true;
  } else {
    detail.value = item;
    showDetail.value = true;
  }
}

function closeDetail() {
  showDetail.value = false;
 onClose()
}
 function onClose() {
  console.log('');
  
   emit('close');
} 
function workerDetail() {
  onClose()
}
function getBorderColor(statusType) {
  switch (statusType) {
    case '紧急':
      return '#ff0000';
    case '严重':
      return '#ffc900';
    default:
      return '#00ff00';
  }
}
function openShow() {
  showDetail1.value = true;
}

function  handleSelect(){
    showDetail1.value = false;
     emit('closeFn');
 
}
</script>
<style scoped>
.alarm-modal {
  width: 100%;
  background: rgba(118, 116,116, 0.4);
  border-radius: 8px;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 4px solid rgba(255, 255, 255, 0.99);
}
.modal-header h3 {
  margin: 0;
  font-size: 28px;
}
.close-btn {
  cursor: pointer;
  font-size: 28px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  padding-top: 0px;
}

.modal-body {
  padding: 16px;
}
.modal-body .row {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 25px;
}
.transfer-container {
  display: flex;
  height: 300px;
  border: 1px solid #ddd;
  margin-top: 10px;
}
.panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-size: 24px;
}
.panel + .panel {
  border-left: 1px solid #eee;
}
.dept-header {
  font-weight: bold;
  margin-top: 8px;
}
.person-row,
.selected-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #f56c6c;
  font-size: 20px;
}
/* 从底部缓动进场 & 退场 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease-out;
}
.modal-enter-from {
  opacity: 0;
  transform: translateY(100px) scale(0.95);
}
.modal-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.modal-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.modal-leave-to {
  opacity: 0;
  transform: translateY(100px) scale(0.95);
}
.tabs {
  display: flex;
  font-size: 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  margin-bottom: 12px;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  position: relative;
  user-select: none;
}
.tab.active {
  color: #fff;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #409eff;
}

.content {
  max-height: 520px;
  overflow-y: auto;
  padding-top: 8px;
}
.field {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.field label {
  color: rgba(255, 255, 255, 0.8);
}
.field span {
  font-weight: 500;
}
.select-modal {
  position: absolute;
  top: 30%;
  right: -150%;
  width: 450px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
