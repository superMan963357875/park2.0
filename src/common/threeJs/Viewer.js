import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { bindWASDControls } from '@/common/threeJs/utils/keyboard';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import DynamicResolutionController from './DynamicResolutionController.js'
import Stats from 'stats.js';
import { gsap } from 'gsap';
import SkyBoxs from "./SkyBoxs";
import Lights from "./Lights";

export default class ThreeViewer {
  
  _prevCameraState = null;

  constructor(container) {
    this.container = container;

    console.log('ThreeViewer 容器:', container);

    // 动画队列
    this.animates = [];

    // 后处理相关
    this.composer = null;
    this.outlinePass = null;
    this.unrealBloomPass = null;
    this.useComposer = false;

    // 初始化
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLight();
    this.initControls();
    this.initSkybox();
    
    // 创建动态分辨率控制器 先禁用 有需要在开
    // this.resolutionController = new DynamicResolutionController(
    //   this.renderer,
    //   this.camera
    // );

    // // 启用
    // this.resolutionController.enable();
    
    // 射线拾取
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    try {
      this.renderer.domElement.style.touchAction = 'none';
    } catch (e) {
      // 低权限环境忽略
    }

    // WebGL context lost / restore
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('⚠️ WebGL context lost');
      this._webglContextLost = true;
    });
    
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this._webglContextLost = false;
    });

    // resize 带防抖
    this._resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.onWindowResize(), 150);
    });

    // 启动渲染循环
    this._isRunning = true;
    this.animate(performance.now());
  }

  initScene() {
    this.scene = new THREE.Scene();
  }

  initSkybox() {
    if (!this.skyboxs) {
      this.skyboxs = new SkyBoxs(this);
    }
    this.skyboxs.setSkybox();
    // this.initStats();
  }

  initCamera() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
  }

  initStats() {
    // this.stats = new Stats();
    // this.stats.showPanel(0);
    // this.container.appendChild(this.stats.dom);
    // Object.assign(this.stats.dom.style, {
    //   position: 'absolute',
    //   left: '40%',
    //   top: '40%',
    //   transform: 'scale(3)',
    //   zIndex: '100',
    // });
  }

  initControls() {
    // controls 绑定在 renderer.domElement 上
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.enableZoom = true; 
    this.controls.enablePan = true;
    this.controls.enableRotate = true;

    // 阻尼
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // 限制
    this.controls.minDistance = 0.5;
    // this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.3;

    // 控制速度
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 1.0;
    this.controls.update();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: false,
    });

    const desiredDPR = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(desiredDPR);

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;

    // 阴影
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 将 canvas 插入容器
    this.container.appendChild(this.renderer.domElement);
  }

  initLight() {
    if (!this.lights) {
      this.lights = new Lights(this);
    }
  }

  initPostProcessing() {
    // 如果没有 renderer / scene / camera 直接退出
    if (!this.renderer || !this.scene || !this.camera) return;

    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const v2 = new THREE.Vector2(this.container.clientWidth, this.container.clientHeight);
    this.outlinePass = new OutlinePass(v2, this.scene, this.camera);
    this.outlinePass.edgeStrength = 1;
    this.outlinePass.edgeGlow = 1;
    this.outlinePass.edgeThickness = 1;
    this.outlinePass.pulsePeriod = 0;
    this.composer.addPass(this.outlinePass);
   
    // Bloom
    this.unrealBloomPass = new UnrealBloomPass();
    this.unrealBloomPass.strength =2;
    this.unrealBloomPass.radius = 1;
    this.unrealBloomPass.threshold = 1;
    this.composer.addPass(this.unrealBloomPass);

    this.useComposer = true;
  }

  // 安全释放 composers
  disposeComposer() {
    if (!this.composer) return;
    try {
      this.composer.passes.forEach((p) => {
        if (p.dispose) p.dispose();
        if (p.renderTarget) {
          p.renderTarget.dispose && p.renderTarget.dispose();
        }
      });
      this.composer = null;
      this.useComposer = false;
    } catch (e) {
      console.warn('dispose composer error', e);
    }
  }

  setOutlineObjects(objects, color = 0xfae900) {
    if (this.outlinePass) {
      this.outlinePass.visibleEdgeColor.set(color);
      this.outlinePass.selectedObjects = objects;
    }
  }

  // 渲染循环
  animate(currentTime = performance.now()) {
    if (!this._isRunning) return;

    requestAnimationFrame((t) => this.animate(t));

    // 如果 WebGL context lost，跳过渲染
    if (this._webglContextLost) return;

    // stats 开始
    // this.stats?.begin && this.stats.begin();

    // 执行动画队列
    for (let i = 0; i < this.animates.length; i++) {
      try {
        const item = this.animates[i];
        item.fun && item.fun.call(null, item.content);
      } catch (e) {
        console.warn('动画报错', e);
      }
    }
    
    // this.resolutionController.update(performance.now());
    
    // controls 更新
    this.controls?.update();

    // 渲染 labels（如果存在）
    if (this.labels) {
      try {
        this.labels.css3DRenderer.render(this.scene, this.camera);
        this.labels.css2DRenderer.render(this.scene, this.camera);
      } catch (e) {
        // ignore
      }
    }

    // composer or direct render
    try {
      if (this.composer && this.useComposer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (e) {
      console.error('render error', e);
    }

    // stats 结束
    // this.stats?.end && this.stats.end();
  }

  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      try {
        this.composer.setSize(width, height);
      } catch (e) {
        // ignore
      }
    }
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects(this.scene.children, true)[0];
    if (!hit) return;

    const { object, point } = hit;
    const localPoint = object.worldToLocal(point.clone());

    console.log('点击到的模型：', object);
    console.log('世界坐标：', point);
    console.log('本地坐标：', localPoint);

    if (this.clickCallback) {
      this.clickCallback({ object, world: point, local: localPoint });
    }
  }

  setClickCallback(callback) {
    this.clickCallback = callback;
  }

  lookAtTarget(target) {
    this.camera.lookAt(target);
  }

  addAnimate(obj) {
    this.animates.push(obj);
    return obj;
  }

  removeAnimate(obj) {
    const index = this.animates.indexOf(obj);
    if (index !== -1) this.animates.splice(index, 1);
  }

  setControlledModel(model, worldOctree) {
    this.controlledModel = model;
    this.scene.add(model.object);
    bindWASDControls(model, worldOctree);
  }

  flyToCamera(targetPosition, targetLookAt, targetFov, duration = 1) {
    const cam = this.camera;
    const controls = this.controls;

    this._prevCameraState = {
      pos: cam.position.clone(),
      quat: cam.quaternion.clone(),
      fov: cam.fov,
      target: controls.target.clone()
    };

    const tl = gsap.timeline();

    tl.to(cam.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => controls.update()
    }, 0);

    tl.to(controls.target, {
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => controls.update()
    }, 0);

    tl.to(cam, {
      fov: targetFov,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => cam.updateProjectionMatrix()
    }, 0);

    return tl;
  }

  flyBack(duration = 1, prevCameraState) {
    if (prevCameraState) this._prevCameraState = prevCameraState;

    if (!this._prevCameraState) return;
    const { pos, fov, target } = this._prevCameraState;
    const cam = this.camera;
    const controls = this.controls;

    const tl = gsap.timeline({ onComplete: () => { this._prevCameraState = null; } });

    tl.to(cam.position, {
      x: pos.x, y: pos.y, z: pos.z, duration, ease: 'power2.inOut', onUpdate: () => controls.update()
    }, 0);

    tl.to(controls.target, {
      x: target.x, y: target.y, z: target.z, duration, ease: 'power2.inOut', onUpdate: () => controls.update()
    }, 0);

    tl.to(cam, {
      fov, duration, ease: 'power2.inOut', onUpdate: () => cam.updateProjectionMatrix()
    }, 0);
  }

  // 清理销毁
  dispose() {
    this._isRunning = false;
    window.removeEventListener('resize', this.onWindowResize);
    try {
      this.renderer.domElement.removeEventListener('click', this.onClick);
    } catch (e) {}
    this.disposeComposer();
    // dispose scene resources
    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose && m.dispose());
          } else {
            obj.material.dispose && obj.material.dispose();
          }
        }
      }
    });
    try {
      this.renderer.forceContextLoss && this.renderer.forceContextLoss();
      this.renderer.dispose && this.renderer.dispose();
    } catch (e) {}
  }
}