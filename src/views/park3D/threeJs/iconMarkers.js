// icon-markers.js (no-animation)
import * as THREE from 'three';
import BuildingTag from '../components/BuildingCard.vue';
import { createApp } from 'vue';
import { changeLiftFn} from './index.js'
export  class IconMarkers {
  // 缓存一下 纹理材质共享一哈
  static _texCache = new Map();
  static _matCache = new Map();

  constructor(viewer, modelRoot) {
    this.viewer = viewer;
    this.modelRoot = modelRoot;
    this.groups = new Map();
  }
  static async create(viewer, modelRoot, specs) {
    console.log('33333333333', specs);

    const ins = new IconMarkers(viewer, modelRoot);
    await ins._build(specs || []);
    return ins;
  }

  destroy() {
    for (const [, group] of this.groups) {
      group.sprites.forEach((s) => s.removeFromParent());
      group.sprites.length = 0;

      // 若没有其他组引用同一材质，则释放
      const mat = group.material;
      let stillUsed = false;
      for (const [, g2] of this.groups) {
        if (g2 !== group && g2.material === mat) {
          stillUsed = true;
          break;
        }
      }
      if (!stillUsed) {
        const tex = mat.map;
        mat.dispose();
        if (tex) tex.dispose();
      }
    }
    this.groups.clear();
  }

 

  async _build(specs) {
    // 预加载材质（缓存）
    await Promise.all(specs.map((s) => this._ensureMaterial(s.iconUrl)));
    const allNodes = [];
    this.modelRoot.traverse((o) => allNodes.push(o));

    //  为每个 spec 生成 sprites
    for (const spec of specs) {
      const {
        key,
        match = {},
        iconUrl,
        scale = [1, 1],
        yOffset = 0,
        opacity = 0.95
      } = spec;
      // 从我的缓存获取基础材质并克隆
      const baseMat = IconMarkers._matCache.get(iconUrl);
      const material = baseMat.clone();
      material.opacity = opacity;
      material.depthTest = false;
      material.transparent = true;

      const sprites = [];
      const pos = new THREE.Vector3();
      const matched = allNodes.filter((a) => this._matchName(a.name, match));
      console.log(
        '[markers]',
        spec.key,
        'matched',
        matched.length,
        'on root:',
        this.modelRoot.name
      );
      for (const node of matched) {
        node.getWorldPosition(pos);
        console.log('nodenodenodenode', node.name);

        const spr = new THREE.Sprite(material);
        spr.position.copy(pos);
        spr.scale.set(scale[0], scale[1], 1);
        spr.frustumCulled = false;
        spr.name = node.name;
        spr.key = spec.key;
        this.viewer.scene.add(spr);
        sprites.push(spr);
      }

      this.groups.set(key, { sprites, material, cfg: spec });
    }
  }
  // 匹配
  _matchName(name, rule) {
    if (!name) return false;
    if (rule.prefix && String(name).startsWith(rule.prefix)) return true;
    if (rule.includes && String(name).includes(rule.includes)) return true;
    if (rule.regex) {
      const re =
        rule.regex instanceof RegExp ? rule.regex : new RegExp(rule.regex);
      return re.test(name);
    }
    return false;
  }

  async _ensureMaterial(url) {
    if (IconMarkers._matCache.has(url)) return;
    const tex = await this._loadTexture(url);

    tex.encoding = THREE.sRGBEncoding;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    IconMarkers._texCache.set(url, tex);
    IconMarkers._matCache.set(url, mat);
  }
  // 加载我的精灵图
  _loadTexture(url) {
    if (IconMarkers._texCache.has(url))
      return Promise.resolve(IconMarkers._texCache.get(url));
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(url, (tex) => resolve(tex), undefined, reject);
    });
  }
}

const spriteLabelCache = new WeakMap(); // Sprite -> { el, handle }
let currentTag = null;
let labelIns=null
export function removeCurrentTag() {
  if (!currentTag) return;
  if (typeof labelIns?.removeCss2dLabel === 'function' && currentTag.handle) {
    labelIns.removeCss2dLabel(currentTag.handle);
  } else if (currentTag.el?.parentNode) {
    currentTag.el.parentNode.removeChild(currentTag.el);
  }
  // createApp 挂了 Vue 组件卸载
  if (currentTag.app && typeof currentTag.app.unmount === 'function') {
    currentTag.app.unmount();
  }
  currentTag = null;
}
function rightTopOffsetPos(target, camera, right = 0.9, up = 0.35) {
  // 用相机的世界基向量：x=右、y=上、z=后
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  camera.matrixWorld.extractBasis(xAxis, yAxis, zAxis);
  xAxis.normalize();
  yAxis.normalize();
  return target
    .clone()
    .add(xAxis.multiplyScalar(right))
    .add(yAxis.multiplyScalar(up));
}
//通过图标点击
export function cameraFlyTo(viewer, ModelObjet, labelIn) {
  labelIns=labelIn
  viewer.setClickCallback(({ object, WorldPosition }) => {
 
    if (object.type === 'Sprite' || object.name === 'error_02') {
      const target = new THREE.Vector3();
      object.getWorldPosition(target);
      const radius = 0.8;
      const yawDeg = -1;
      const pitchDeg = 0.8;
      const yaw = THREE.MathUtils.degToRad(yawDeg);
      const phi = Math.PI / 2 - THREE.MathUtils.degToRad(pitchDeg);
      const offset = new THREE.Vector3().setFromSphericalCoords(
        radius,
        phi,
        yaw
      );
      const finalPos = target.clone().add(offset);
      viewer.flyToCamera?.(finalPos, target, 60, 1.2);
      removeCurrentTag(labelIns);
      // 缺陷目前 通过图标点击 设备状态为空先写死
      createOrUpdateTag(object, target, viewer, labelIns,'ok');
    }
  });
}
// 设备类型配置
const DEVICE_CONFIGS = {
  camera: {
    videoFlag: true,
    additionalItems: [
      { label: '实时画面', value: '', type: 'ok' }
    ]
  },
  light: {
    lightFlag: true
  },
  lift: {
    additionalItems: [
      { label: '是否超载', value: '否', type: 'ok' },
      { label: '梯内监控', url: '/assets/电梯画面.png', type: 'ok' }
    ]
  },
  Barrier: {
    additionalItems: [
      { label: '今日进/出', value: '10/40' },
      { label: '监控画面', url: '/assets/电梯画面.png', type: 'ok' }
    ],
    BarrierFlag:true
  },
  error:{ 
    additionalItems: [
      { label: '告警标题', value: '非法人员闯入', },
      { label: '告警内容', value: '园区北半区有非法人员闯入', },
      { label: '告警时间', value: '2025/10/22 9:20',  },
    ],
    alertFlag:true
  }
};

// 门禁设备名称匹配
const DOOR_DEVICE_NAMES = ['door禁'];

// 状态映射
const STATUS_MAP = {
  ok: '在线',
  error: '离线'
};

/**
 * 获取设备状态文本
 * @param {Object} value - 设备值对象
 * @returns {string} 状态文本
 */
function getDeviceStatus(value) {
  return value?.status ? STATUS_MAP[value.status] || '未知' : null;
}

/**
 * 根据设备类型获取配置
 * @param {Object} sprite - 精灵对象
 * @returns {Object} 设备配置
 */
function getDeviceConfig(sprite) {
  const config = DEVICE_CONFIGS[sprite.key] || {};
 
  // 检查是否为门禁设备
  if (DOOR_DEVICE_NAMES.includes(sprite.name)) {
    config.doorFlag = true;
  }
  return config;
}

/**
 * 设备信息项
 * @param {Object} sprite - 精灵对象
 * @param {string} status - 设备状态
 * @param {Object} deviceConfig - 设备配置
 * @returns {Array} 信息项数组
 */
function buildDeviceItems(sprite, status, deviceConfig) {
  // 默认的基础信息
  let baseItems = [
    { label: '设备ID', value: '_00037' },
    { label: '设备名称', value: sprite.name },
    { label: '运行状态', value: status, type: 'ok' }
  ];
  if (sprite.key === 'error') {
    const v = sprite.value || {};
    // 先兼容一下多种字段命名
    const title   = v.title   ?? v.name   ?? '—';
    const content = v.messages ?? v.desc   ?? v.msg ?? '—';
    const time    = v.time    ?? v.timestamp ?? v.date ?? '—';

    return [
      { label: '告警标题', value: title },
      { label: '告警内容', value: content },
      { label: '告警时间', value: time }
    ];
  }
  return deviceConfig.additionalItems
    ? [
        ...baseItems,
        ...(typeof deviceConfig.additionalItems === 'function'
            ? deviceConfig.additionalItems(sprite.value) 
            : deviceConfig.additionalItems)
      ]
    : baseItems;
}

/**
 * 创建或更新标签
 * @param {Object} sprite - 精灵对象
 * @param {THREE.Vector3} target - 目标位置
 * @param {Object} viewer - 查看器对象
 * @param {Object} labelIns - 标签实例
 * @param {Object} value - 设备值
 */
function createOrUpdateTag(sprite, target, viewer, labelIns, value) {
  console.log('sprite', sprite.value);
  console.log('1111111111',value);
  
  const status = getDeviceStatus(value);
  // 根据设备类型获取配置
  const deviceConfig = getDeviceConfig(sprite); 
  const pos = rightTopOffsetPos(target, viewer.camera, -0.4, 0);
  
  // 清理已存在的标签
  const cached = spriteLabelCache.get(sprite);
  if (cached?.handle && typeof labelIns?.removeCss2dLabel === 'function') {
    labelIns.removeCss2dLabel(cached.handle);
  }
  
  // 创建新标签
  const el = document.createElement('div');
   let app = null;
  const items = buildDeviceItems(sprite, status, deviceConfig);
  
  if (typeof createApp === 'function') {
    app = createApp(BuildingTag, {
      title: '设备信息',
      name: sprite.name,
      badge: '在线',
      status: 'error',
      scale: '1',
      lightOn: deviceConfig.lightFlag,
      alertFlag: deviceConfig.alertFlag,
      doorFlag: deviceConfig.doorFlag,
      BarrierFlag:deviceConfig.BarrierFlag,
      videoFlag: deviceConfig.videoFlag,
      items: items
    });
    app.mount(el);
  }
  
  const handle = labelIns.addCss2dLabel({ x: pos.x, y: pos.y, z: pos.z }, el);
  currentTag = { el, handle, app };
  spriteLabelCache.set(sprite, { el, handle });
}

/**
 * 相机飞行配置
 */
const CAMERA_FLIGHT_CONFIG = {
  radius: 0.8,
  yawDeg: -1,
  pitchDeg: 0.8,
  fov: 60,
  duration: 1.2
};

/**
 * 计算相机飞行位置
 * @param {THREE.Vector3} target - 目标位置
 * @returns {THREE.Vector3} 最终相机位置
 */
function calculateCameraPosition(target) {
  const { radius, yawDeg, pitchDeg } = CAMERA_FLIGHT_CONFIG;
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const phi = Math.PI / 2 - THREE.MathUtils.degToRad(pitchDeg);
  
  const offset = new THREE.Vector3().setFromSphericalCoords(radius, phi, yaw);
  return target.clone().add(offset);
}

/**
 * 特殊设备处理
 * @param {string} deviceId - 设备ID
 */
function handleSpecialDevice(deviceId) {
  if (deviceId === '电梯1内') {
    changeLiftFn();
  }
}

/**
 * 通过大屏设备列表定位到3D模型
 * @param {Object} value - 设备值
 * @param {Object} viewer - 查看器对象
 * @param {Object} modelObject - 模型对象
 * @param {Object} labelIns - 标签实例
 *  // 后期待优化 换成type  
 */
export function equipmentDe(value, viewer, modelObject, labelIns) {
  const equipmentName = modelObject.getObjectByName(value.id);
  if (!equipmentName) {
    console.warn(`设备 ${value.id} 未找到`);
    return;
  }
  console.log('定位设备:', equipmentName);
  // 设置设备类型
  equipmentName.key = value.key;
  // 先这样写 后面在该
  equipmentName.value=value
  // 计算目标位置和相机位置
  const target = new THREE.Vector3();
  equipmentName.getWorldPosition(target);
  const finalPos = calculateCameraPosition(target);
  const { fov, duration } = CAMERA_FLIGHT_CONFIG;
  viewer.flyToCamera?.(finalPos, target, fov, duration);
  // 处理特殊设备
  handleSpecialDevice(value.id);
  // 移除当前标签并创建新标签
  removeCurrentTag(labelIns);
  // 待优化 
  createOrUpdateTag(equipmentName, target, viewer, labelIns, value);
}