import { Box3, Vector3 } from 'three';
import { gsap } from 'gsap';
import { IconMarkers, removeCurrentTag } from './iconMarkers.js';
import * as THREE from 'three';
// 参考 https://blog.csdn.net/weixin_54984179/article/details/150959191
export class ExplodeFloors {
  /**
   * @param {THREE.Object3D|THREE.Object3D[]} rootOrFloors 我的对象模型
   * @param {Object} opts
   * @param {string[]=} opts.floorNames   - 如果楼层在根节点下按名字可取，传名字数组
   * @param {boolean=} opts.fixedFirst    - 第一层是否固定不动（默认 true）
   * @param {number=} opts.gap            - 楼层间距（米/单位，默认 12）
   * @param {number=} opts.duration       - 单层动画时长（默认 1.2）
   * @param {number=} opts.stagger        - 楼层间开始时间错峰（默认 0.1）
   * @param {string=} opts.ease           - GSAP 缓动（默认 'power2.out'）
   * @param {boolean=} opts.autoSort      - 是否按楼层中心Y自动排序（默认 true）
   */
  constructor(rootOrFloors, opts = {}) {
    const defaults = {
      fixedFirst: true,
      gap: 12,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power2.out',
      floorNames: null,
      autoSort: true
    };
    this.opts = { ...defaults, ...opts };
    // 收集我的楼层
    this.floors = Array.isArray(rootOrFloors)
      ? rootOrFloors
      : this._collectFloors(rootOrFloors, this.opts.floorNames);

    if (!this.floors.length) {
      console.log('什么也没有啊怎么看楼层啊');
    }

    // 已垂直位置的Y中心点从下倒上排序
    if (this.opts.autoSort) this._sortFloorsByCenterY(this.floors);

    // 记录一下一开始我们模型y的位置
    this.originalY = this.floors.map((f) => f.position.y);
    this.targetY = this._computeTargets();

    this._tl = null;
    this.state = 'idle';
  }

  _collectFloors(root, names) {
    if (!root) {
      console.log('啥东西也没有赛!');
    }
    if (Array.isArray(names) && names.length) {
      return names.map((n) => root.getObjectByName(n)).filter(Boolean);
    }
    // 简版默认：把 root 的直接子节点当作楼层
    return root.children.filter((obj) => obj.isObject3D && obj.visible);
  }

  _sortFloorsByCenterY(arr) {
    const box = new Box3();
    const tmp = new Vector3();
    const centerY = (o) => (box.setFromObject(o), box.getCenter(tmp).y);
    arr.sort((a, b) => centerY(a) - centerY(b));
  }

  _computeTargets() {
    const { gap, fixedFirst } = this.opts;
    return this.floors.map((_, i) => {
      const base = this.originalY[i];
      const offset = i === 0 && fixedFirst ? 0 : i * gap;
      return base + offset;
    });
  }
  // 把楼层按设定的间距与顺序，上移到目标高度的拆楼层
  explode() {
    const { duration, stagger, ease } = this.opts;
    if (this._tl) this._tl.kill();
    const tl = gsap.timeline();
    this.floors.forEach((floor, i) => {
      tl.to(
        floor.position,
        { y: this.targetY[i], duration, ease },
        i * stagger
      );
    });
    this._tl = tl;
    this.state = 'exploded';
    return tl;
  }
  /** 统一把 floor 标识解析成索引 */
  _resolveIndex(target) {
    if (typeof target === 'number')
      return Math.max(0, Math.min(this.floors.length - 1, target));
    if (typeof target === 'string') {
      const idx = this.floors.findIndex((f) => f.name === target);
      return idx >= 0 ? idx : -1;
    }
    if (target && typeof target === 'object') {
      const idx = this.floors.indexOf(target);
      return idx >= 0 ? idx : -1;
    }
    return -1;
  }
    /** 上移上方楼层，聚焦到某层
   * @param {number|string|THREE.Object3D} target
   * @param {Object} opts
   * @param {number=} opts.gapAbove - 仅上方楼层的间距（默认用 this.opts.gap）
   * @param {number=} opts.liftStart - 上方第一层起始抬升量（默认 1 * gapAbove）
   * @param {boolean=} opts.pushBelow - 是否把下方楼层也下移（默认 false）
   * @param {number=} opts.gapBelow - 下移间距（默认与 gap 相同）
   * @param {boolean=} opts.hideOthers - 是否仅显示目标楼层，其它层临时隐藏（默认 false）
   */
  focusFloor(target, opts = {}) {
    const idx = this._resolveIndex(target);
    if (idx < 0) {
      console.log('没找到楼层', target);
      return;
    }
    const {
      gapAbove = this.opts.gap,
      liftStart = gapAbove, // 第一层上移量
      pushBelow = false,
      gapBelow = this.opts.gap,
      hideOthers = false
    } = opts;

    if (this._tl) this._tl.kill();
    const tl = gsap.timeline();
    const { duration, ease } = this.opts;

    // 隐藏非目标楼层
    if (hideOthers) {
      this.floors.forEach((f, i) => {
        f.visible = i === idx;
      });
    } else {
      // 确保都可见
      this.floors.forEach((f) => (f.visible = true));
    }

    // 目标层回到原始 Y（保持不动）
    tl.to(
      this.floors[idx].position,
      { y: this.originalY[idx], duration, ease },
      0
    );

    for (let i = idx + 1; i < this.floors.length; i++) {
      const order = i - idx; // 第几层在上方
      const targetY = this.originalY[i] + liftStart + (order - 1) * gapAbove;
      tl.to(
        this.floors[i].position,
        { y: targetY, duration, ease },
        0 + order * 0.05
      ); 
    }

    // 目标层下方向下让位
    if (pushBelow) {
      for (let i = idx - 1; i >= 0; i--) {
        const order = idx - i;
        const targetY = this.originalY[i] - order * gapBelow;
        tl.to(
          this.floors[i].position,
          { y: targetY, duration, ease },
          0 + order * 0.05
        );
      }
    } else {
      // 不下移则回原位
      for (let i = idx - 1; i >= 0; i--) {
        tl.to(
          this.floors[i].position,
          { y: this.originalY[i], duration, ease },
          0
        );
      }
    }

    this._tl = tl;
    this.state = 'focused';
    return tl;
  }

  /** 取消聚焦，所有楼层回到 originalY（与 reset 相同，但不改变其它状态） */
  clearFocus() {
    const { duration, ease } = this.opts;
    if (this._tl) this._tl.kill();
    const tl = gsap.timeline();
    this.floors.forEach((floor, i) => {
      floor.visible = true;
      tl.to(floor.position, { y: this.originalY[i], duration, ease }, 0);
    });
    this._tl = tl;
    this.state = 'reset';
    return tl;
  }

  reset() {
    const { duration, stagger, ease } = this.opts;
    if (this._tl) this._tl.kill();
    const tl = gsap.timeline();
    this.floors.forEach((floor, i) => {
      tl.to(
        floor.position,
        { y: this.originalY[i], duration, ease },
        i * stagger
      );
    });
    this._tl = tl;
    this.state = 'reset';
    return tl;
  }

  toggle() {
    return this.state === 'exploded' ? this.reset() : this.explode();
  }
}
let markers = null;
let AllMarkers = null;
var _layerRunId = 0; //防止快速切换的异步出现问题
let explodeFx=null
export async function clickChangeLayer(layer, explode, ModelObjet, viewer) {
  console.log('1111111111111',AllMarkers);
  explodeFx=explode
  let targetPosition = null
  let targetLookAt = null
  if (AllMarkers) {
    AllMarkers.destroy()
    AllMarkers=null
  }
  if (layer == '1楼') {
     targetPosition = new THREE.Vector3(-2.7120875894614787,  8.0795829269986815, -11.748551912424436);
     targetLookAt = new THREE.Vector3(-2.532705447334239, 4.33768044831525, -5.050354856140346); 
  } else if (layer == '2楼') {
    targetPosition = new THREE.Vector3(-2.7120875894614787,  9.0795829269986815, -11.748551912424436);
     targetLookAt = new THREE.Vector3(-2.532705447334239, 4.33768044831525, -5.050354856140346);  
   } else if (layer == '3楼') { 
     targetPosition = new THREE.Vector3(-2.7120875894614787,  10.0795829269986815, -11.748551912424436);
     targetLookAt = new THREE.Vector3(-2.532705447334239, 4.33768044831525, -5.050354856140346);
  }

  if (layer == '全楼') {
      targetPosition = new THREE.Vector3( -2.127201658293145, 6.912565554667719, -11.145655716043574 );
      targetLookAt = new THREE.Vector3(-2.2878652738412626, 6.192752776918601e-18, 1.899433400139317);

    explodeFx.reset?.();
 
  }
     if (markers) {
      markers.destroy();
      markers = null;
      removeCurrentTag()
    }
   viewer.flyToCamera(targetPosition, targetLookAt, 60, 3);
  await explodeFx.focusFloor(layer, {
    gapAbove: 180, // 上方楼层之间的抬升间距（
    liftStart: 180, // 紧挨着目标层的第一层抬升量
    pushBelow: false, // 下方不下移要下移就改 true
    hideOthers: false // 只看当前层可改 true其它层临时隐藏
  });
  const runId = ++_layerRunId;

  // 只在当前楼层的子树内寻找点位
  const floorRoot = ModelObjet.getObjectByName(layer);
  if (!floorRoot) {
    console.warn('未找到楼层节点:', layer);
    return;
  }
  let specs = [
    {
      key: 'camera',
      match: { prefix: layer + '摄像机' },
      iconUrl: '/assets/监控.svg',
      scale: [0.3, 0.3],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    },
       {
      key: 'light',
      match: { prefix: layer + '灯' },
      iconUrl: '/assets/灯光.svg',
      scale: [0.3, 0.3],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    },
     {
      key: 'door',
      match: { regex:  '门禁' },
      iconUrl: '/assets/门禁.svg',
      scale: [0.3, 0.3],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    },
    {
      key: 'ac',
      match: { includes: layer + '空调' },
      iconUrl: '/assets/空调.svg',
      scale: [0.3, 0.3]
    },
    {
      key: 'hydrant',
      match: { regex: layer + '消防栓' },
      iconUrl: '/assets/消防栓.svg',
      scale: [0.3, 0.3]
    }
  ];
  const created = await IconMarkers.create(viewer, floorRoot, specs);
  // 如果期间用户又点了别的楼层，就丢弃这次结果
  if (runId !== _layerRunId) {
    created.destroy();
  
    return;
  }

  markers = created;
 
  
   removeCurrentTag()
}
export async function createImg(viewer, floorRoot, title) { 
  if (AllMarkers) {
    AllMarkers.destroy()
    AllMarkers=null
  }
  if (explodeFx) { 
    explodeFx.reset?.();
  }
   if (markers) {
      markers.destroy();
      markers = null;
      removeCurrentTag()
    }
 removeCurrentTag()
   const specs = [ ];
  if (title == '视频监控') {
    specs.push({
      key: 'camera',
      match: { regex: `摄像机` },
      iconUrl: '/assets/监控.svg',
      scale: [0.1, 0.1],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    })
  } else if (title == '门禁系统') {
      specs.push( {
      key: 'door',
      match: { regex:  'door禁' },
      iconUrl: '/assets/门禁.svg',
      scale: [0.1, 0.1],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    })
  } else if (title == '暖通空调') {
     specs.push( {
      key: 'ac',
      match: { regex:  '空调' },
      iconUrl: '/assets/空调.svg',
      scale: [0.1, 0.1]
    })
   }
  else if (title == '智慧照明') { 
    specs.push(  {
      key: 'light',
      match: { regex:  '灯' },
      iconUrl: '/assets/灯光.svg',
      scale: [0.1, 0.1],
      bobbing: { amp: 0.5, speed: [0.5, 1.5] }
    })
  }
  else if (title == '电梯梯控') { }
  else if (title == '消防设备') {
      specs.push({
      key: 'hydrant',
      match: { regex: '消防栓' },
      iconUrl: '/assets/消防栓.svg',
      scale: [0.1, 0.1]
    })
   }
  
  
  AllMarkers= await IconMarkers.create(viewer, floorRoot, specs);
      
}