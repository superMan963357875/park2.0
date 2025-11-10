<template>
  <div class="viewer-wrapper">
    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay" role="status" aria-live="polite">
      <div class="progress-bar" aria-hidden="true">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">工地模型加载中请您耐心等待….. {{ progress }}%</span>
    </div>

    <!-- Three.js 容器 -->
    <div id="containerId" ref="threeContainer"></div>
    <div
      class="marsTiltPanel-wrap1 marsTiltPanel1 marsTiltPanel-theme-blue1"
      v-if="marsTiltPanelDIV"
    >
      <div class="area">
        <div class="arrow-lt"></div>
        <div class="b-t"></div>
        <div class="b-r"></div>
        <div class="b-b"></div>
        <div class="b-l"></div>
        <div class="arrow-rb"></div>
        <div class="label-wrap">
          <div class="label-content">
            <div class="data-li">
              <div class="data-label">状态：</div>
              <div class="data-value">
                <span class="label-num status-value">{{ data.status || defaultTexts.statusWalking }}</span>
              </div>
            </div>
            <div class="data-li">
              <div class="data-label">时间：</div>
              <div class="data-value">
                <span class="label-num time-value">{{ data.time || "--" }}</span>
              </div>
            </div>
            <div class="data-li">
              <div class="data-label">静止时间：</div>
              <div class="data-value">
                <span class="label-num stop-value">{{ data.stopTime || "--" }}</span>
              </div>
            </div>
            <div class="data-li">
              <div class="data-label">地点：</div>
              <div class="data-value">
                <span class="label-num location-value">{{ data.location || "--" }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- <div class="toolbar">
      <button class="tool-btn" @click="printCamera">打印相机</button>
      <button class="tool-btn" @click="printCamera1">移动车</button>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  shallowRef,
  onMounted,
  onBeforeUnmount,
  nextTick,
  createApp,
  reactive,
} from "vue";
import * as THREE from "three";

import ThreeViewer from "@/common/threeJs/Viewer";
import ModelLoader from "@/common/threeJs/ModelLoader";
import SkyBoxs from "@/common/threeJs/SkyBoxs";
import Labels from "@/common/threeJs/Labels";
import Lights from "@/common/threeJs/Lights";
import {
  setModel,
  switchScene,
  updateFenceBrightness,
  createFence,
  to3D,
  fence,
  escapeFu,
} from "./threeJs/index.js";
import {
  initialPersonData,
  typeKeywords,
  typeKeywordsArray,
  personLocationMap,
  defaultLocation,
  floorPositions,
  areaPositions,
  pathMapping,
  allWorkNames,
  cameraPositions,
  timeData,
  locationUpdateArrays,
  pausePointsConfig,
  fenceConfig,
  pathTrailConfig,
  specialPersonNames,
  baseElementsToHide,
  areaLabels,
  defaultTexts,
} from "./index.ts";

const threeContainer = ref(null);
const loading = ref(false);
const progress = ref(0);
const viewer = shallowRef(null);
const modelLoader = shallowRef(null);
const skyBoxs = shallowRef(null);
const ModelObjet = shallowRef(null); //模型对象
const explodeFx = shallowRef(null);
const cars = [];
const _createdTags = new Map();
let labelIns = null;
let DirectionalLight = ref(null);
let lights = ref(null);
let imgTitle = ref(null); //用来区分点击的是什么设备
let updateIntervals = []; // 存储所有的定时器

const _box = new THREE.Box3();
const _centerVec = new THREE.Vector3();
const _sizeVec = new THREE.Vector3();
const marsTiltPanelDIV = ref(false);
let data = ref({
  ...initialPersonData,
});
async function printCamera() {
  if (!viewer.value) return;
  console.log("当前摄像机:", viewer.value.camera);
  console.log("当前控制器:", viewer.value.controls);
  console.log("ModelObjet:", ModelObjet.value);

}

function createTagForObject(target) {
  if (!target) {
    console.warn("createTagForObject: target 为空");
    return null;
  }

  if (_createdTags.has(target.uuid)) {
    const existing = _createdTags.get(target.uuid);
    return existing;
  }

  // 计算初始位置
  _box.setFromObject(target);
  _box.getCenter(_centerVec);
  _box.getSize(_sizeVec);
  const offset = Math.max(1, _sizeVec.y * 0.05);
  const topY = _box.max.y + offset;

  const pos = { x: _centerVec.x, y: topY, z: _centerVec.z };

  // 创建 DOM 元素
  const div = document.createElement("div");
  div.className = "marsTiltPanel marsTiltPanel-theme-blue";
  div.innerHTML = `
    <div class="marsTiltPanel-wrap">
      <div class="area">
        <div class="arrow-lt"></div>
        <div class="b-t"></div>
        <div class="b-r"></div>
        <div class="b-b"></div>
        <div class="b-l"></div>
        <div class="arrow-rb"></div>
        <div class="label-wrap">
         ${
          data.value.name &&  !data.value.name1
            ? `<div class="title">姓名：<span class="name-value">${data.value.name || defaultTexts.unknownPerson}</span></div>`
            : ""
        }
            ${
          data.value.name1
            ? `<div class="title">姓名：<span class="name-value">${data.value.name1 || defaultTexts.unknownPerson}</span></div>`
            : ""
        }
          <div class="label-content">
          <div class="data-li">
              <div class="data-label">工种：</div>
              <div class="data-value">
                <span class="label-num workType-value">${
                  data.value.workType || defaultTexts.defaultWorkType
                }</span>
              </div>
            </div>
             <div class="data-li">
              <div class="data-label">当前位置：</div>
              <div class="data-value">
                <span class="label-num location-value">${
                  data.value.location || "--"
                }</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="b-t-l"></div>
      <div class="b-b-r"></div>
      <div class="arrow"></div>
    </div>
  `;
  const handle = labelIns.addCss2dLabel(pos, div.outerHTML);

  console.log("标签创建成功:", { target: target.name, handle, pos });

  const entry = {
    object: target,
    handle,
    // 更新标签内容
    update(newData) {
      Object.assign(data.value, newData);

      if (this.handle && this.handle.element) {
        const element = this.handle.element;
        if (newData.name !== undefined) {
          const nameEl = element.querySelector(".name-value");
          if (nameEl) nameEl.textContent = newData.name;
        }
        if (newData.workType !== undefined) {
          const nameEl = element.querySelector(".workType-value");
          if (nameEl) nameEl.textContent = newData.workType;
        }
        if (newData.status !== undefined) {
          const nameEl = element.querySelector(".status-value");
          if (nameEl) nameEl.textContent = newData.status;
        }

        if (newData.stopTime !== undefined) {
          const timeEl = element.querySelector(".stop-value");
          if (timeEl) timeEl.textContent = newData.stopTime;
        }
        if (newData.location !== undefined) {
          const locationEl = element.querySelector(".location-value");
          if (locationEl) locationEl.textContent = newData.location;
        }
      }
    },
    // 更新标签位置
    updatePosition(newPos) {
      if (this.handle && this.handle.position) {
        this.handle.position.set(newPos.x, newPos.y, newPos.z);
      }
    },
    // 销毁标签
    destroy() {
      if (this.handle && viewer.value && viewer.value.scene) {
      }
      _createdTags.delete(this.object.uuid);
    },
  };

  _createdTags.set(target.uuid, entry);
  return entry;
}
// 生成人员标签

const tags = ref([]);
const persons = ref([]);

function createPersonLabelByType(type) {
  if (!ModelObjet.value || !ModelObjet.value.model) {
    console.warn("模型未加载完成!");
    return;
  }
  clearAllTags();
  
  // 如果没有传入 type,则展示所有类型
  const shouldShowAll = !type;
  const keyword = type ? typeKeywords[type] : null;

  if (type && !keyword) {
    console.warn(`未识别的类型:${type}`);
    return;
  }

  // 遍历所有人员模型
  ModelObjet.value.model.scene.traverse((child) => {
    if (!child.name) return;
    
    // 检查是否是人员类型
    const hasAnyType = typeKeywordsArray.some((kw) =>
      child.name.includes(kw)
    );
    
    if (!hasAnyType) return;
    // 判断是否应该显示这个人员
    let shouldShow = false;
    
    if (shouldShowAll) {
      // 展示所有人员
      shouldShow = true;
      persons.value.push(child);
    } else {
      // 只展示匹配类型的人员
      if (child.name.includes(keyword)) {
        shouldShow = true;
        persons.value.push(child);
      }
    }
  
    child.visible = shouldShow;
  });

  if (persons.value.length === 0) {
    const typeMsg = shouldShowAll ? "所有类型" : `类型为 ${type}`;
    return;
  }

  persons.value.forEach((person, index) => {
    const worldPos = new THREE.Vector3();
    person.getWorldPosition(worldPos);
    worldPos.y += 5;

    const tag = createTagForObject(person);
    const cleanName = person.name.replace(/(施工人员|安全人员|特种人员|管理人员)/g, "");
    const match = person.name.match(/(施工人员|安全人员|特种人员|管理人员)/);
    const workType = match ? match[1] : defaultTexts.unknownWorkType;
    // 从配置中获取位置,如果没有则使用默认位置
    const location = personLocationMap[cleanName] || defaultLocation;
    tag.update({ name: `${cleanName}`, workType: `${workType}`, location: location });
   
    tags.value.push(tag);
  });

}

function clearAllTags() {
  if(tags.value){
    tags.value.forEach((tag, index) => {
    if (tag && tag.handle) {
      if (tag.handle.parent) {
     
        tag.handle.parent.remove(tag.handle);
      }
      if (viewer.value && viewer.value.scene) {
        viewer.value.scene.remove(tag.handle);
      }
      if (tag.handle.element) {
        const element = tag.handle.element;
        if (element.style) {
          element.style.display = "none";
        }
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }

      if (typeof tag.dispose === "function") {
        tag.dispose();
      }
      if (typeof tag.destroy === "function") {
        tag.destroy();
      }
      if (typeof tag.remove === "function") {
        tag.remove();
      }
    }
  });
  }

  // 清空数组
  tags.value = [];
  persons.value = [];
  _createdTags.clear();
}
function hideAllPersonsAndTags() {
  ModelObjet.value.model.scene.traverse((child) => {
    if (!child.name) return;
    // 检查是否是人员类型
    const isPerson = typeKeywordsArray.some((kw) => child.name.includes(kw));
    if (isPerson) {
      child.visible = false; // 隐藏人物模型
    }
  });

  clearAllTags();

}
// 创建电子围栏
function iframeCreateFence(value) {
  createFence(
    fenceConfig.position,
    fenceConfig.width,
    fenceConfig.depth,
    {
      ...fenceConfig.options,
      brightness: value !== undefined ? value : fenceConfig.options.brightness,
    }
  );
}

// 人物动画和标签跟随
function iframeEscapeFu() {
  hideAllPersonsAndTags()
    const worker = ModelObjet.value.getObjectByName("交互人员");
     worker.visible=true
      _createdTags.delete(worker.uuid);
    marsTiltPanelDIV.value=true
     ModelObjet.value.startAnimal(1, { loop: "repeat" });
    const pathTrail = createPathTrail(pathTrailConfig.escapeFu);
    // 初始相机位置
    const { targetPosition, targetLookAt } = cameraPositions.escapeFuInitial;
    viewer.value.flyToCamera(targetPosition, targetLookAt, 60, 1);

    const a = ModelObjet.value.getObjectByName("上下楼路径");
  
    const stop2 = ModelObjet.value.getObjectByName("停顿点2");
    const stop3 = ModelObjet.value.getObjectByName("停顿点3");

    if (!a) {
      console.warn("未找到上下楼路径");
      return;
    }
    a.visible = false;

    // 提取路径点
    const posAttr = a.geometry.attributes.position;
    const pathPoints = [];
    for (let i = 0; i < posAttr.count; i++) {
      pathPoints.push(
        new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      );
    }

    const curve = new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 1);
    

    // 创建跟随标签
    const tag1 = createTagForObject(worker, data.value);
    
    // 时间自动增加功能 - 每3秒增加1分钟
    let timeAccumulator = 3; // 初始值设为3，让第一帧就触发时间增加
    const timeInterval = 3; // 每3秒
    
    function incrementTime() {
      // 解析当前时间
      const currentTime = new Date(data.value.time.replace(' ', 'T'));
      // 增加1分钟
      currentTime.setMinutes(currentTime.getMinutes() + 1);
      // 格式化回字符串 (不包含秒数)
      const year = currentTime.getFullYear();
      const month = String(currentTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentTime.getDate()).padStart(2, '0');
      const hours = String(currentTime.getHours()).padStart(2, '0');
      const minutes = String(currentTime.getMinutes()).padStart(2, '0');
      
      data.value.time = `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    const pausePoints = [];
    if (stop2) {
      const pos2 = new THREE.Vector3();
      stop2.getWorldPosition(pos2);
      pausePoints.push({
        position: pos2,
        duration: pausePointsConfig.stop2.duration,
        label: pausePointsConfig.stop2.label,
        animation: pausePointsConfig.stop2.animation,
        callback: () => {
          console.log("到达停顿点2");
          tag1.update({
            status: pausePointsConfig.stop2.status,
            stopTime: pausePointsConfig.stop2.stopTime,
          });
        },
      });
    }

    if (stop3) {
      const pos3 = new THREE.Vector3();
      stop3.getWorldPosition(pos3);
      pausePoints.push({
        position: pos3,
        duration: pausePointsConfig.stop3.duration,
        label: pausePointsConfig.stop3.label,
        animation: pausePointsConfig.stop3.animation,
        callback: () => {
          console.log("到达停顿点3");
          tag1.update({
            stopTime: pausePointsConfig.stop3.stopTime,
            location: pausePointsConfig.stop3.location,
          });
        },
      });
    }

    // 停顿系统状态
    let pauseState = {
      isPaused: false,           // 是否正在停顿
      currentPauseIndex: -1,     // 当前停顿点索引
      pauseTimer: 0,             // 停顿计时器
      pauseDuration: 0,          // 当前停顿持续时间
      checkedPauses: new Set(),  // 已检查过的停顿点
      detectionRadius: 1.5,      // 检测半径（调整这个值来控制触发距离）
    };

    let progress = 0;
    const clock = new THREE.Clock();
    let stopAnimation = false;
    let isBlinking = false;
    let blinkTime = 0;
    let cameraSwitched = false;

    let animateFn = viewer.value.addAnimate({
      content: worker,
      fun: () => {
        if (stopAnimation && !isBlinking) return;

        const delta = clock.getDelta();
        
        // 累加时间并检查是否需要增加时间（每3秒增加1分钟）
        timeAccumulator += delta;
        if (timeAccumulator >= timeInterval) {
          timeAccumulator = 0;
          incrementTime();
          // 更新标签时间显示
          tag1.update({ time: data.value.time });
        }

        if (!stopAnimation) {
       
          if (pauseState.isPaused) {
            pauseState.pauseTimer += delta;
            if (pauseState.pauseTimer >= pauseState.pauseDuration) {
              pauseState.isPaused = false;
              pauseState.pauseTimer = 0;
              tag1.update({
                status: defaultTexts.statusWalking,
                stopTime: defaultTexts.pause3F,   
              });           
            }       
            return;
          }
          progress = Math.min(progress + 0.02 * delta, 1);
          const pos = curve.getPointAt(progress);
          worker.position.copy(pos);
          pathTrail.update(pos, delta);
          //  检测是否到达停顿点
          for (let i = 0; i < pausePoints.length; i++) {
            const pausePoint = pausePoints[i];
            
            // 如果这个停顿点已经触发过，跳过
            if (pauseState.checkedPauses.has(i)) continue;

            // 计算距离
            const distance = pos.distanceTo(pausePoint.position);
            
            // 到达停顿点
            if (distance < pauseState.detectionRadius) {
              pauseState.isPaused = true;
              pauseState.currentPauseIndex = i;
              pauseState.pauseDuration = pausePoint.duration;
              pauseState.pauseTimer = 0;
              pauseState.checkedPauses.add(i); // 标记为已触发
          
              // 执行回调
              if (pausePoint.callback) {
                pausePoint.callback();
              }
              break; 
            }
          }

          // 定义关键楼层位置
          const oneF = floorPositions.oneF;
          const towF = floorPositions.towF;
          const threeF = floorPositions.threeF;

          // 区域定义
          const A = areaPositions.A;
          const B = areaPositions.B;
          const C = areaPositions.C;
          const D = areaPositions.D;

          // 楼层计算
          let floorLabel = "1F";
          if (pos.y >= (towF.y + oneF.y) / 2 && pos.y < (threeF.y + towF.y) / 2) {
            floorLabel = "2F";
          } else if (pos.y >= (threeF.y + towF.y) / 2) {
            floorLabel = "3F";
          }

          // 区域判断
          let areaLabel = floorLabel;
          const distToA = pos.distanceTo(A);
          const distToB = pos.distanceTo(B);
          const distToC = pos.distanceTo(C);
          const distToD = pos.distanceTo(D);

          if (distToA < 30) {
            areaLabel = areaLabels.aArea;
            if (!pauseState.isPaused) {
              tag1.update({ time: timeData.aAreaTime });
            }
          } else if (distToB < 20) {
            areaLabel = areaLabels.bArea;
            if (!pauseState.isPaused) {
              tag1.update({ time: timeData.bAreaTime });
            }
          } else if (distToC < 5) {
            areaLabel = areaLabels.cArea;
            if (!pauseState.isPaused) {
              tag1.update({ time: timeData.cAreaTime });
            }
          } else if (distToD < 5) {
            areaLabel = areaLabels.dArea;
            if (!pauseState.isPaused) {
              tag1.update({ time: timeData.dAreaTime });
            }
          }
         
          // 更新标签位置与文字
          if (tag1) {
            const worldPos = new THREE.Vector3();
            worker.getWorldPosition(worldPos);
            worldPos.y += 5;
            tag1.updatePosition(worldPos);
            
            if (!pauseState.isPaused) {
              tag1.update({ location: `${areaLabel}` });
            }
          }

          if (areaLabel == areaLabels.bArea && !cameraSwitched) {
            cameraSwitched = true;
            const { targetPosition, targetLookAt } = cameraPositions.bAreaCamera;
            viewer.value.flyToCamera(targetPosition, targetLookAt, 60, 0.5);
          }

          // 面朝方向
          const tangent = curve.getTangentAt(progress);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            tangent.clone().normalize()
          );
          worker.quaternion.slerp(quaternion, 0.2);

          if (progress >= 0.99) {
            tag1.update({
              location: "厂房",
              stopTime: "",
            });
             setTimeout(() => {
            viewer.value.removeAnimate(animateFn);
              marsTiltPanelDIV.value=false
            if (tag1 && tag1.handle) {
              if (viewer.value?.scene) viewer.value.scene.remove(tag1.handle);
              if (tag1.handle.element?.parentNode)
                tag1.handle.element.parentNode.removeChild(tag1.handle.element);
            }
             _createdTags.delete(worker.uuid);
            pathTrail.destroy();
          }, 3000);
          }
        }
      },
    });
}
// 动态更新全部地点
// control.updateAllLocations(["一楼A区", "一楼B区", "二楼A区", "二楼B区", "三楼A区", "三楼B区", "四楼A区", "四楼B区", "五楼A区", "五楼B区"]);
// 更新指定人员的地点
// control.updateWorkerLocation("王证", "一楼新地点");
// *******先做出来就害怕后面加********
//  暂停
// control.pause();
// 继续
// control.resume();
// 停止
// control.stop();
function allScapeFu(selectedWorkerNames = null){
  hideAllPersonsAndTags()
  let workers = [];
  let animateFunctions = [];
  let currentPathMapping = [...pathMapping];
  let currentWorkNames = [...allWorkNames];

  // 根据传入的名字过滤人员，如果没有传入则使用全部
  let workNames = currentWorkNames;
  if (selectedWorkerNames && selectedWorkerNames.length > 0) {
    workNames = currentWorkNames.filter(w => selectedWorkerNames.includes(w.name));
    // 只保留选中的人员对应的路线
    currentPathMapping = currentPathMapping.slice(0, workNames.length);
    
  }

  // 检查人员和线路数量是否匹配
  if (workNames.length !== currentPathMapping.length) {
    console.error(`人员数量(${workNames.length})与线路数量(${currentPathMapping.length})不匹配`);
    return;
  }
  ModelObjet.value.startAnimal(1, { loop: "repeat" });

  // 初始相机位置
  const { targetPosition, targetLookAt } = cameraPositions.allScapeFuInitial;
  viewer.value.flyToCamera(targetPosition, targetLookAt, 60, 1);

  // 为每条线路创建对应的worker
  for (let index = 0; index < currentPathMapping.length; index++) {
    const { path: pathName, location: realLocation } = currentPathMapping[index];
    const { model: modelName, name: realName } = workNames[index];
    
    // 1. 获取指定的人员模型
    const workerModel = ModelObjet.value.getObjectByName(modelName);
    if (!workerModel) {
      console.warn(`未找到人员: ${modelName}`);
      continue;
    }

    // 2. 获取路线对象
    const pathObj = ModelObjet.value.getObjectByName(pathName);
    if (!pathObj) {
      console.warn(`未找到路线: ${pathName}`);
      continue;
    }

    pathObj.visible = false;

    // 3. 提取路径点
    const posAttr = pathObj.geometry.attributes.position;
    if (!posAttr) {
      console.warn(`路线 ${pathName} 没有position属性`);
      continue;
    }

    const pathPoints = [];
    for (let j = 0; j < posAttr.count; j++) {
      pathPoints.push(
        new THREE.Vector3(posAttr.getX(j), posAttr.getY(j), posAttr.getZ(j))
      );
    }

    //  创建曲线
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 1);

    // 设置人员模型可见
    workerModel.visible = true;

    // 创建路径跟踪
    const pathTrail = createPathTrail(pathTrailConfig.allScapeFu);

    // 创建标签
    const tag = createTagForObject(workerModel, data.value);

    // 存储worker信息
    workers.push({
      model: workerModel,
      modelName: modelName,
      realName: realName,
      curve: curve,
      pathName: pathName,
      currentLocation: realLocation, // 当前地点（会被更新）  
      progress: 0,
      tag: tag,
      pathTrail: pathTrail,
      isCompleted: false,
      index: index
    });
  }

  // 为每个worker创建动画循环
  workers.forEach((workerInfo) => {
    const clock = new THREE.Clock();
    let stopAnimation = false;

    const animateFn = viewer.value.addAnimate({
      content: workerInfo.model,
      fun: () => {
        if (stopAnimation || workerInfo.isCompleted) return;
        const delta = clock.getDelta();
        
        // 推进度
        workerInfo.progress = Math.min(workerInfo.progress + 0.02 * delta, 1);
        const pos = workerInfo.curve.getPointAt(workerInfo.progress);
        workerInfo.model.position.copy(pos);
        workerInfo.pathTrail.update(pos, delta);

        // 更新标签 - 使用真实名字和当前地点
        if (workerInfo.tag) {
          const worldPos = new THREE.Vector3();
          workerInfo.model.getWorldPosition(worldPos);
          worldPos.y += 5;
          workerInfo.tag.updatePosition(worldPos);
          workerInfo.tag.update({
            name: workerInfo.realName,
            location: workerInfo.currentLocation,
            status: defaultTexts.statusWalking,
            progress: `${Math.round(workerInfo.progress * 100)}%`
          });
        }

        // 模型面朝方向
        const tangent = workerInfo.curve.getTangentAt(workerInfo.progress);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          tangent.clone().normalize()
        );
        workerInfo.model.quaternion.slerp(quaternion, 0.2);

        // 路线完成
        if (workerInfo.progress >= 0.99) {
          workerInfo.isCompleted = true;
          workerInfo.tag.update({
            location: defaultTexts.completeWalking,
            status: defaultTexts.statusStill,
            stopTime: ""
          });

          // 检查所有worker是否完成
          checkAllCompleted();
        }
      }
    });

    animateFunctions.push({
      animateFn: animateFn,
      workerInfo: workerInfo,
      stop: () => {
        stopAnimation = true;
      }
    });
  });

  // 检查所有worker是否完成
  function checkAllCompleted() {
    const allCompleted = workers.every(w => w.isCompleted);
    if (allCompleted) {
      setTimeout(() => {
        // 清理资源
        animateFunctions.forEach(anim => {
          viewer.value.removeAnimate(anim.animateFn);
        });

        workers.forEach((worker) => {
          // 隐藏标签
          if (worker.tag && worker.tag.handle) {
            if (viewer.value?.scene) viewer.value.scene.remove(worker.tag.handle);
            if (worker.tag.handle.element?.parentNode)
              worker.tag.handle.element.parentNode.removeChild(worker.tag.handle.element);
          }
          console.log('2222222',worker);
          
          _createdTags.delete(worker.model.uuid);
          // 销毁路径跟踪
          if (worker.pathTrail) {
            worker.pathTrail.destroy();
          }
          
          // 隐藏人员模型
          if (worker.model) {
            worker.model.visible = false;
          }
        });
     
      }, 2000);
    }
  }
  return {
    // 停止所有worker
    stop: () => {
      animateFunctions.forEach(anim => {
        anim.stop();
        viewer.value.removeAnimate(anim.animateFn);
      });

      workers.forEach((worker) => {
        // 隐藏标签
        if (worker.tag && worker.tag.handle) {
          if (viewer.value?.scene) viewer.value.scene.remove(worker.tag.handle);
          if (worker.tag.handle.element?.parentNode)
            worker.tag.handle.element.parentNode.removeChild(worker.tag.handle.element);
        }
       
        // 销毁路径跟踪
        if (worker.pathTrail) {
          worker.pathTrail.destroy();
        }
        
        // 隐藏人员模型
        if (worker.model) {
          worker.model.visible = false;
        }
      });

      marsTiltPanelDIV.value = false;
    },

    // 暂停所有worker
    pause: () => {
      animateFunctions.forEach(anim => {
        anim.stop();
      });
    },

    // 继续所有worker
    resume: () => {
      animateFunctions.forEach(anim => {
        anim.stop = () => {}; // 取消暂停
      });
    },

    // 动态更新地点 
    updateAllLocations: (newLocations) => {
      if (newLocations.length !== workers.length) {
        console.warn(`传入的地点数量(${newLocations.length})与当前worker数量(${workers.length})不匹配`);
        return false;
      }
      
      workers.forEach((worker, index) => {
        worker.currentLocation = newLocations[index];
     
      });
      
      return true;
    },

    // 动态更新指定人员的地点
    updateWorkerLocation: (realName, newLocation) => {
      const worker = workers.find(w => w.realName === realName);
      if (worker) {
        worker.currentLocation = newLocation;
    
        return true;
      } else {
        console.warn(`未找到人员: ${realName}`);
        return false;
      }
    },
  };
}
// 告警回放
// 全局变量存储需要清理的资源
let escapeFuResources = {
  worker: null,
  tag: null,
  redLight: null,
  animateId: null,
  fence: null,
};
let escapeAnimateFn = null;
// 告警
let pathTrail=null
function iframeEscapeFu1() {
  
  destroyEscapeFu1();
  iframeCreateFence();
  hideAllPersonsAndTags()
  const { targetPosition, targetLookAt } = cameraPositions.escapeFu1Initial;
  viewer.value.flyToCamera(targetPosition, targetLookAt, 60, 1);
  pathTrail = createPathTrail(pathTrailConfig.escapeFu1);
  marsTiltPanelDIV.value = true;
  const worker = ModelObjet.value.getObjectByName("交互人员");
  worker.visible = true;
   _createdTags.delete(worker.uuid);
  ModelObjet.value.startAnimal(1, { loop: "repeat" });
  let a = ModelObjet.value.getObjectByName("闯入路径");
  let tag = null;
  if (!worker) {
    console.warn("未找到施工人员对象");
    return;
  }
  if (!a) {
    console.warn("未找到闯入路径");
    return;
  }
  // 保存 worker 引用
  escapeFuResources.worker = worker;
  tag = createTagForObject(worker, data.value);
  escapeFuResources.tag = tag;
  const posAttr = a.geometry.attributes.position;
  const pathPoints = [];
  for (let i = 0; i < posAttr.count; i++) {
    pathPoints.push(new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)));
  }

  const curve = new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 1);

  const error = ModelObjet.value.getObjectByName("告警点");
  const lamp = ModelObjet.value.getObjectByName("灯");

  if (!error || !lamp) {
    console.warn("未找到告警点或灯");
    return;
  }

  const errorPos = new THREE.Vector3();
  error.getWorldPosition(errorPos);

  // 创建红色点光源 初始强度为0
  const redLight = new THREE.PointLight(0xff0000, 0, 10);
  const lampPos = new THREE.Vector3();
  lamp.getWorldPosition(lampPos);
  lampPos.z -= 0.5;
  redLight.position.copy(lampPos);
  ModelObjet.value.model.scene.add(redLight);

  // 保存红光引用
  escapeFuResources.redLight = redLight;

  let progress = 0;
  const clock = new THREE.Clock();
  let stopAnimation = false;
  let isBlinking = false;
  let blinkTime = 0;

  escapeAnimateFn = {
    content: worker,
    fun: () => {
      if (stopAnimation && !isBlinking) return;

      const delta = clock.getDelta();

      if (!stopAnimation) {
        worker.mixer?.update(delta);

        // 路径移动
        progress = Math.min(progress + 0.1 * delta, 1);

        const pos = curve.getPointAt(progress);
        worker.position.copy(pos);
        pathTrail.update(pos, delta);
        const oneF = floorPositions.oneF;
        const towF = floorPositions.towF;
        const threeF = floorPositions.threeF;

        // 施工A半区
        const A = areaPositions.A;
        // 施工B半区
        const B = areaPositions.B;
        const C = areaPositions.C;
        const D = areaPositions.D;

        // 计算楼层
        let floorLabel = "1F";
        if (pos.y >= (towF.y + oneF.y) / 2 && pos.y < (threeF.y + towF.y) / 2) {
          floorLabel = "2F";
        } else if (pos.y >= (threeF.y + towF.y) / 2) {
          floorLabel = "3F";
        }

        let areaLabel = floorLabel;
        const distToA = pos.distanceTo(A);
        const distToB = pos.distanceTo(B);
        const distToC = pos.distanceTo(C);
        const distToD = pos.distanceTo(D);

        if (distToA < 30) {
          areaLabel = areaLabels.aArea;
          tag?.update({ time: timeData.aAreaTime });
        } else if (distToB < 20) {
          areaLabel = areaLabels.bArea;
          tag?.update({ time: timeData.bAreaTime });
        } else if (distToC < 5) {
          areaLabel = areaLabels.cArea;
          tag?.update({ time: timeData.cAreaTime });
        } else if (distToD < 5) {
          areaLabel = areaLabels.dArea;
          tag?.update({ time: timeData.dAreaTime });
        }

        if (tag) {
          const worldPos = new THREE.Vector3();
          worker.getWorldPosition(worldPos);
          worldPos.y += 4;
          tag.updatePosition(worldPos);
          tag.update({ location: `${areaLabel}` });
        }
        let hasTriggeredAlarm = false;
        const distanceToError = pos.distanceTo(errorPos);
        if (distanceToError < 1 && !hasTriggeredAlarm) {
          stopAnimation = true;
          hasTriggeredAlarm = true;
          isBlinking = true;
          tag?.update({
            status: defaultTexts.statusStill,
            location: defaultTexts.alarmArea,
          });

          const { camPos, targetLookAt } = cameraPositions.alarmPointCamera;
          viewer.value.flyToCamera(camPos, targetLookAt, 60, 1);
       
        }

        // 面朝方向
        const tangent = curve.getTangentAt(progress);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          tangent.clone().normalize()
        );
        worker.quaternion.slerp(quaternion, 0.2);
      }

      // 灯光闪烁逻辑
      if (isBlinking) {
        blinkTime += delta;
        const intensity = Math.abs(Math.sin(blinkTime * Math.PI * 2)) * 5;
        redLight.intensity = intensity;
      }
    },
  };

  viewer.value.addAnimate(escapeAnimateFn);
}
function stopPlay(){
   destroyEscapeFu1();      
   pathTrail.destroy();
}
// 销毁函数
function destroyEscapeFu1(value) {
  console.log("开始清理 EscapeFu1 资源...");
  
  if (escapeAnimateFn && viewer.value) {
    viewer.value.removeAnimate?.(escapeAnimateFn);
    escapeAnimateFn = null;
  }
  if (escapeFuResources.tag?.handle) {
    viewer.value.scene.remove(escapeFuResources.tag.handle);
  }
  // 移除红色点光源
  if (escapeFuResources.redLight && ModelObjet.value?.model?.scene) {
    ModelObjet.value.model.scene.remove(escapeFuResources.redLight);
    escapeFuResources.redLight.dispose?.();
    escapeFuResources.redLight = null;
  }
  if (escapeFuResources.worker) {
    if (escapeFuResources.worker.mixer) {
      escapeFuResources.worker.mixer.stopAllAction();
    }

    escapeFuResources.worker.visible = false;

    escapeFuResources.worker = null;
  }

  // 清空其他资源
  escapeFuResources = {
    worker: null,
    tag: null,
    redLight: null,
    animateId: null,
    fence: null,
  };
  marsTiltPanelDIV.value = false;

}

// 路径轨迹资源管理
let pathTrailResources = {
  trailLine: null, // 路径线条对象
  trailPoints: [], // 记录的路径点
  trailMaterial: null, // 材质
  trailGeometry: null, // 几何体
};

/**
 * 创建路径轨迹生成器
 * @param {Object} options 配置选项
 * @returns {Object} 轨迹生成器对象
 */
function createPathTrail(options = {}) {
  const config = {
    color: options.color || 0x00ff00, // 路径颜色（默认绿色）
    lineWidth: options.lineWidth || 14, // 线条宽度
    opacity: options.opacity || 0.8, // 透明度
    samplingInterval: options.samplingInterval || 0.1, // 采样间隔（秒）
    minDistance: options.minDistance || 0.5, // 最小记录距离
    maxPoints: options.maxPoints || 1000, // 最大点数
    fadeEffect: options.fadeEffect !== false, // 渐变效果
    glowEffect: options.glowEffect || false, // 发光效果
    animated: options.animated || false, // 动画效果
    dashSize: options.dashSize || 2, // 虚线大小
    gapSize: options.gapSize || 1, // 虚线间隙
    dashed: options.dashed || false, // 是否虚线
  };

  const trailPoints = [];
  let lastRecordTime = 0;
  let lastRecordPosition = null;
  let trailLine = null;
  let trailGeometry = null;
  let trailMaterial = null;

  // 创建材质
  if (config.dashed) {
    // 虚线材质
    trailMaterial = new THREE.LineDashedMaterial({
      color: config.color,
      linewidth: config.lineWidth,
      opacity: config.opacity,
      transparent: true,
      dashSize: config.dashSize,
      gapSize: config.gapSize,
    });
  } else {
    // 实线材质
    trailMaterial = new THREE.LineBasicMaterial({
      color: config.color,
      linewidth: config.lineWidth,
      opacity: config.opacity,
      transparent: true,
      vertexColors: config.fadeEffect, // 启用顶点颜色
    });
  }

  // 创建初始几何体
  trailGeometry = new THREE.BufferGeometry();
  trailLine = new THREE.Line(trailGeometry, trailMaterial);
  trailLine.frustumCulled = false; // 防止被剔除

  // 添加到场景
  if (ModelObjet.value?.model?.scene) {
    ModelObjet.value.model.scene.add(trailLine);
  }

  // 保存资源引用
  pathTrailResources.trailLine = trailLine;
  pathTrailResources.trailMaterial = trailMaterial;
  pathTrailResources.trailGeometry = trailGeometry;
  pathTrailResources.trailPoints = trailPoints;

  /**
   * 更新路径点（在动画循环中调用）
   */
  function update(currentPosition, delta) {
    lastRecordTime += delta;

    // 检查是否需要记录新点
    if (lastRecordTime < config.samplingInterval) {
      return;
    }

    // 检查距离是否足够
    if (lastRecordPosition) {
      const distance = currentPosition.distanceTo(lastRecordPosition);
      if (distance < config.minDistance) {
        return;
      }
    }

    // 记录新点
    trailPoints.push(currentPosition.clone());
    lastRecordPosition = currentPosition.clone();
    lastRecordTime = 0;

    // 限制最大点数（移除最旧的点）
    if (trailPoints.length > config.maxPoints) {
      trailPoints.shift();
    }

    // 更新几何体
    updateGeometry();
  }

  /**
   * 更新几何体
   */
  function updateGeometry() {
    if (trailPoints.length < 2) return;

    // 创建顶点数组
    const positions = new Float32Array(trailPoints.length * 3);
    const colors = new Float32Array(trailPoints.length * 3);

    for (let i = 0; i < trailPoints.length; i++) {
      const point = trailPoints[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      // 渐变效果（从旧到新逐渐变亮）
      if (config.fadeEffect) {
        const alpha = i / (trailPoints.length - 1);
        const color = new THREE.Color(config.color);
        colors[i * 3] = color.r * alpha;
        colors[i * 3 + 1] = color.g * alpha;
        colors[i * 3 + 2] = color.b * alpha;
      }
    }
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (config.fadeEffect) {
      trailGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    trailGeometry.computeBoundingSphere();
  }

  function clear() {
    trailPoints.length = 0;
    lastRecordPosition = null;
    lastRecordTime = 0;

    if (trailGeometry) {
      trailGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(0), 3)
      );
    }
  }

  function destroy() {
    if (trailLine && ModelObjet.value?.model?.scene) {
      ModelObjet.value.model.scene.remove(trailLine);
    }

    trailGeometry?.dispose();
    trailMaterial?.dispose();

    trailPoints.length = 0;

    // 清空资源引用
    pathTrailResources.trailLine = null;
    pathTrailResources.trailMaterial = null;
    pathTrailResources.trailGeometry = null;
    pathTrailResources.trailPoints = [];
  }
  return {
    update,
    clear,
    destroy,

    getPoints: () => trailPoints,
    getPointCount: () => trailPoints.length,
  };
}

/*加载模型*/
function loadModelToSceneAsync(url) {
  return new Promise((resolve, reject) => {
    if (!modelLoader.value) return reject(new Error("ModelLoader 未初始化"));
    loading.value = true;
    progress.value = 0;
    modelLoader.value.loadModelToScene(
      url,
      (dsModel) => {
        loading.value = false;
        resolve(dsModel);
      },
      (pStr) => {
        progress.value = Math.round(parseFloat(pStr) * 100);
      },
      (err) => {
        loading.value = false;
        reject(err);
      }
    );
  });
}
function initializeScene() {
  const workerModels = allWorkNames.map(w => w.model);
  const pathModels = pathMapping.map(p => p.path);
  const allToHide = [...baseElementsToHide, ...workerModels, ...pathModels];
  allToHide.forEach(name => {
    try {
      const element = ModelObjet.value.getObjectByName(name);
      if (element) {
        element.visible = false;
      }
    } catch (error) {
    
    }
  });

}
/*初始化*/
async function init() {
  if (!threeContainer.value) return;
  viewer.value = new ThreeViewer(threeContainer.value);
  modelLoader.value = new ModelLoader(viewer.value);
  labelIns = new Labels(viewer.value);
  lights.value = new Lights(viewer);
  viewer.value!.labels = labelIns;
  const ambientLight = lights.value.addAmbientLight();
  DirectionalLight.value = lights.value.addDirectionalLight([100, 100, -100], {
    color: "#FDF9E9",
    castShadow: true,
  });
  DirectionalLight.value.setOption({ intensity: 8 });
  skyBoxs.value = new SkyBoxs(viewer.value);
  window.addEventListener("message", handleMessage);
  window.addEventListener("resize", onResize);

  await nextTick();

  try {
    ModelObjet.value = await loadModelToSceneAsync("/glb/智慧工地(19).glb");
    initializeScene()
    // 模型奇怪的东西不知道是啥 删除了 不删除 影响我一楼点击
    const objectNames = [
      "Obj3d66-4353863-4835-276_slice002_5",
      "Obj3d66-4353863-4835-276_slice_5",
      "Obj3d66-4353863-4835-276_slice002_4",
      "建筑工地1防尘布009_1",
      "建筑工地1防尘布009",
    ];

    objectNames.forEach((name) => {
      const obj = ModelObjet.value.getObjectByName(name);
      if (!obj) return;

      obj.parent.remove(obj);
      obj.geometry?.dispose();

      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) =>
          m.dispose()
        );
      }
    });

    ModelObjet.value.object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true; // 物体投影
        o.receiveShadow = true; // 物体接收阴影（根据需要开启）
      }
    });

    // 初始化后处理
    viewer.value?.initPostProcessing?.();
    setModel(viewer.value, ModelObjet.value, labelIns);
    to3D();
  

    setTimeout(() => {
      skyBoxs.value.preloadAllSkyboxes();
    }, 1000);
  } catch (err) {
    console.error("模型加载失败：", err);
  }
}

/*清理函数*/
function cleanValue() {
  console.log("执行清理函数");

  updateIntervals.forEach((interval) => clearInterval(interval));
  updateIntervals = [];

  _createdTags.forEach((tag) => tag.destroy?.());
  _createdTags.clear();

  window.removeEventListener("message", handleMessage);
  window.removeEventListener("resize", onResize);
  viewer.value?.controls?.dispose?.();
  viewer.value?.dispose?.();
  viewer.value?.renderer?.dispose?.();
  explodeFx.value = null;

  skyBoxs.value = null;
  modelLoader.value = null;
  viewer.value = null;
}

function handleMessage(event) {
  const { type, payload } = event.data || {};
  if (type == "iframe-toBuilding") return iframeToBuilding(payload);

  if (type == "iframe-carExamine") return iframeCarExamine();
  if (type == "iframe-createLine") return iframeCreateLine();
  if (type == "iframe-createFence") return iframeCreateFence(payload);
  if (type == "iframe-escapeFu") {
    console.log('payload',payload);
    
    if(payload == specialPersonNames.wangZhen){
        iframeEscapeFu()
    }else{
      // iframeEscapeFu()
      const control = allScapeFu();
      setTimeout(() => {
        control.updateAllLocations(locationUpdateArrays.update1);
      }, 3000);
      setTimeout(() => {
        control.updateAllLocations(locationUpdateArrays.update2);
      }, 5000);
        setTimeout(() => {
        control.updateAllLocations(locationUpdateArrays.update3);
      }, 6000);
      setTimeout(() => {
        control.updateAllLocations(locationUpdateArrays.update4);
      }, 8000);
    }

  
  } 
  if (type == "iframe-escapeFu1") return iframeEscapeFu1(payload);
  if (type == "iframe-destroyEscapeFu1") return destroyEscapeFu1();
  if (type == "iframe-createPersonLabelByType") return createPersonLabelByType(payload);
  if (type == "iframe-stopPlay") return stopPlay();
  
}

function onResize() {
  if (!viewer.value) return;
  viewer.value.onResize?.();
}

onMounted(() => {
  init();
});

onBeforeUnmount(() => {
  cleanValue();
});
</script>

<style scoped>
.marsTiltPanel-wrap1 {
  position: absolute;
  top: 0;
  left: 60%;
  width: 150px;
  height: 80px;
  background: rgba(0, 36, 69, 0.85);
  border: 1px solid #3bb4ff;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  padding: 10px;
}
.marsTiltPanel1 .title {
  font-weight: bold;
  color: #40d9d5;
  margin-bottom: 6px;
}
.marsTiltPanel1 .data-li {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.marsTiltPanel1 .arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid #3bb4ff;
}
/* 容器 */
.viewer-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

/* Three 容器 */
#containerId {
  position: relative;
  width: 100%;
  height: 100vh;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6) url("/assets/u100.jpg") no-repeat center/cover;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.progress-bar {
  width: 60%;
  height: 12px;
  background: #333;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}
.progress {
  height: 100%;
  background: #09c;
  transition: width 0.1s ease;
}
.progress-text {
  color: #205da6;
  font-size: 34px;
  padding: 20px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.toolbar {
  position: absolute;
  top: 35%;
  left: 50%;
  z-index: 99;
  display: flex;
  cursor: pointer;
  gap: 12px;
  transform: translateX(-50%);
}
.tool-btn {
  padding: 8px 14px;
  border: 1px solid #5299d3;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
}
.tool-btn:hover {
  transform: translateY(-1px);
  background: rgba(0, 0, 0, 0.5);
}

:deep(.label) {
  position: relative;
  display: inline-block;
  line-height: 0;
}
:deep(.label .img) {
  display: block;
}
:deep(.labelText) {
  position: absolute;
  inset: 0;
  padding-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #fff;
  font-weight: 600;
}
.errorCard {
  width: 300px;
  position: absolute;
  top: 20%;
  left: var(--card-left, 30%);
  z-index: 10000;
}
.a {
  position: relative;
  left: 50%;
  top: 20%;
}
.btag {
  width: 360px;
  position: absolute;
  left: 40%;
  z-index: 99999;
  top: 20%;
}

/* 标签样式 */
:deep(.marsTiltPanel) {
  position: relative;
  width: 150px;
  background: rgba(0, 36, 69, 0.5);
  border: 1px solid #3bb4ff;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  padding: 10px;
  pointer-events: none;
}
:deep(.marsTiltPanel .title) {
  font-weight: bold;
  color: #40d9d5;
  margin-bottom: 6px;
}
:deep(.marsTiltPanel .data-li) {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
:deep(.marsTiltPanel .arrow) {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid #3bb4ff;
}
</style>
