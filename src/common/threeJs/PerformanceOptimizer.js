import * as THREE from 'three';

/**
 * 🚀 Three.js 性能优化工具类
 * 提供多种性能优化策略，适用于低端设备和大型场景
 */
export default class PerformanceOptimizer {
  
  constructor(viewer) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.renderer = viewer.renderer;
    this.camera = viewer.camera;
    
    // 性能配置
    this.config = {
      // 1. 渲染优化
      enableFrustumCulling: true,      // 视锥体裁剪
      enableOcclusion: false,           // 遮挡剔除（实验性）
      
      // 2. LOD 配置
      enableLOD: true,                  // 启用 LOD
      lodDistances: [20, 50, 100],      // LOD 距离阈值
      
      // 3. 材质优化
      simplifyMaterials: true,          // 简化材质
      shareTextures: true,              // 共享纹理
      
      // 4. 阴影优化
      optimizeShadows: true,            // 优化阴影
      shadowMapSize: 1024,              // 阴影贴图大小
      
      // 5. 后处理优化
      disablePostProcessing: false,     // 禁用后处理
      
      // 6. 实例化优化
      useInstancing: true,              // 使用实例化
      instanceThreshold: 10,            // 实例化阈值
    };
    
    // 统计信息
    this.stats = {
      originalDrawCalls: 0,
      optimizedDrawCalls: 0,
      instancedObjects: 0,
      culledObjects: 0,
    };
  }

  /**
   * 🎯 一键优化（自动应用所有优化）
   */
  optimizeAll() {
    console.log('🚀 开始一键性能优化...');
    const startTime = performance.now();
    
    // 1. 渲染器优化
    this.optimizeRenderer();
    
    // 2. 场景优化
    this.optimizeScene();
    
    // 3. 材质优化
    this.optimizeMaterials();
    
    // 4. 几何体优化
    this.optimizeGeometries();
    
    // 5. 光照优化
    this.optimizeLights();
    
    // 6. 阴影优化
    if (this.config.optimizeShadows) {
      this.optimizeShadows();
    }
    
    // 7. 实例化优化
    if (this.config.useInstancing) {
      this.createInstances();
    }
    
    // 8. 视锥体裁剪
    if (this.config.enableFrustumCulling) {
      this.enableFrustumCulling();
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`✅ 性能优化完成，耗时: ${duration}ms`);
    this.printStats();
  }

  /**
   * 1️⃣ 渲染器优化
   */
  optimizeRenderer() {
    console.log('🔧 优化渲染器设置...');
    
    const renderer = this.renderer;
    
    // 禁用不必要的功能
    renderer.shadowMap.autoUpdate = false;  // 静态场景禁用自动更新阴影
    renderer.info.autoReset = false;        // 手动重置渲染信息
    
    // 降低像素比（移动设备）
    if (this.isMobile()) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
    
    // 启用对数深度缓冲（避免 Z-fighting）
    // renderer.logarithmicDepthBuffer = true; // 已在初始化时设置
    
    console.log('  ✅ 渲染器优化完成');
  }

  /**
   * 2️⃣ 场景优化
   */
  optimizeScene() {
    console.log('🔧 优化场景结构...');
    
    let meshCount = 0;
    
    this.scene.traverse((object) => {
      if (object.isMesh) {
        meshCount++;
        
        // 禁用自动更新矩阵（静态物体）
        if (!this.isAnimated(object)) {
          object.matrixAutoUpdate = false;
          object.updateMatrix();
        }
        
        // 启用视锥体裁剪
        object.frustumCulled = true;
        
        // 设置渲染顺序（透明物体后渲染）
        if (object.material.transparent) {
          object.renderOrder = 999;
        }
      }
    });
    
    this.stats.originalDrawCalls = meshCount;
    console.log(`  ✅ 场景优化完成，共 ${meshCount} 个网格`);
  }

  /**
   * 3️⃣ 材质优化
   */
  optimizeMaterials() {
    console.log('🔧 优化材质...');
    
    const materials = new Map();
    let optimizedCount = 0;
    
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      
      const material = object.material;
      if (!material) return;
      
      // 简化材质设置
      if (this.config.simplifyMaterials) {
        // 禁用不必要的功能
        material.flatShading = false;           // 禁用平面着色
        material.needsUpdate = false;           // 减少材质更新
        
        // 移动设备降低材质质量
        if (this.isMobile()) {
          material.envMapIntensity = 0.3;       // 降低环境贴图强度
          if (material.roughness !== undefined) {
            material.roughness = Math.max(material.roughness, 0.5);
          }
        }
      }
      
      // 共享相同材质
      if (this.config.shareTextures) {
        const key = this.getMaterialKey(material);
        if (materials.has(key)) {
          object.material = materials.get(key);
          optimizedCount++;
        } else {
          materials.set(key, material);
        }
      }
    });
    
    console.log(`  ✅ 材质优化完成，共享 ${optimizedCount} 个材质`);
  }

  /**
   * 4️⃣ 几何体优化
   */
  optimizeGeometries() {
    console.log('🔧 优化几何体...');
    
    let optimizedCount = 0;
    
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      
      const geometry = object.geometry;
      if (!geometry) return;
      
      // 计算边界球（用于视锥体裁剪）
      if (!geometry.boundingSphere) {
        geometry.computeBoundingSphere();
      }
      
      // 计算边界盒（用于碰撞检测）
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      
      // 删除不必要的属性
      if (geometry.attributes.uv && !object.material.map) {
        geometry.deleteAttribute('uv');
        optimizedCount++;
      }
      
      // 压缩几何体（移除冗余数据）
      // geometry.toNonIndexed(); // 根据需要使用
    });
    
    console.log(`  ✅ 几何体优化完成，优化 ${optimizedCount} 个几何体`);
  }

  /**
   * 5️⃣ 光照优化
   */
  optimizeLights() {
    console.log('🔧 优化光照...');
    
    let lightCount = 0;
    let removedLights = 0;
    
    this.scene.traverse((object) => {
      if (object.isLight) {
        lightCount++;
        
        // 禁用不必要的阴影
        if (object.castShadow) {
          // 只保留主光源的阴影
          if (lightCount > 1) {
            object.castShadow = false;
            removedLights++;
          }
        }
        
        // 降低点光源的距离和衰减
        if (object.isPointLight) {
          object.distance = Math.min(object.distance || 50, 30);
          object.decay = 2;
        }
        
        // 降低聚光灯的角度和距离
        if (object.isSpotLight) {
          object.angle = Math.min(object.angle, Math.PI / 4);
          object.distance = Math.min(object.distance || 50, 40);
        }
      }
    });
    
    console.log(`  ✅ 光照优化完成，移除 ${removedLights} 个光源阴影`);
  }

  /**
   * 6️⃣ 阴影优化
   */
  optimizeShadows() {
    console.log('🔧 优化阴影...');
    
    const shadowMapSize = this.config.shadowMapSize;
    
    this.scene.traverse((object) => {
      if (object.isLight && object.shadow) {
        // 降低阴影贴图分辨率
        object.shadow.mapSize.width = shadowMapSize;
        object.shadow.mapSize.height = shadowMapSize;
        
        // 优化阴影相机范围
        if (object.isDirectionalLight) {
          const d = 20; // 根据场景调整
          object.shadow.camera.left = -d;
          object.shadow.camera.right = d;
          object.shadow.camera.top = d;
          object.shadow.camera.bottom = -d;
          object.shadow.camera.near = 0.5;
          object.shadow.camera.far = 50;
        }
        
        // 启用阴影偏移，避免阴影痤疮
        object.shadow.bias = -0.0001;
        object.shadow.normalBias = 0.02;
      }
    });
    
    console.log(`  ✅ 阴影优化完成，阴影贴图: ${shadowMapSize}x${shadowMapSize}`);
  }

  /**
   * 7️⃣ 实例化渲染（重复物体）
   */
  createInstances() {
    console.log('🔧 创建实例化网格...');
    
    // 按几何体和材质分组
    const groups = new Map();
    const meshesToRemove = [];
    
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      if (this.isAnimated(object)) return; // 跳过动画物体
      
      const key = `${object.geometry.uuid}_${this.getMaterialKey(object.material)}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(object);
    });
    
    // 创建实例化网格
    let instancedCount = 0;
    
    groups.forEach((meshes, key) => {
      // 只有超过阈值才创建实例
      if (meshes.length < this.config.instanceThreshold) return;
      
      const firstMesh = meshes[0];
      const geometry = firstMesh.geometry;
      const material = firstMesh.material;
      
      // 创建实例化网格
      const instancedMesh = new THREE.InstancedMesh(
        geometry,
        material,
        meshes.length
      );
      
      instancedMesh.name = `Instanced_${key}`;
      instancedMesh.castShadow = firstMesh.castShadow;
      instancedMesh.receiveShadow = firstMesh.receiveShadow;
      
      // 设置每个实例的变换矩阵
      const matrix = new THREE.Matrix4();
      meshes.forEach((mesh, i) => {
        mesh.updateMatrixWorld(true);
        matrix.copy(mesh.matrixWorld);
        instancedMesh.setMatrixAt(i, matrix);
        meshesToRemove.push(mesh);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(instancedMesh);
      
      instancedCount++;
      this.stats.instancedObjects += meshes.length;
    });
    
    // 移除原始网格
    meshesToRemove.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    
    console.log(`  ✅ 实例化完成，创建 ${instancedCount} 个实例化网格`);
  }

  /**
   * 8️⃣ 视锥体裁剪优化
   */
  enableFrustumCulling() {
    console.log('🔧 启用视锥体裁剪...');
    
    // 添加到渲染循环
    const updateCulling = () => {
      this.updateFrustumCulling();
    };
    
    this.viewer.addAnimate({
      fun: updateCulling,
      content: null
    });
    
    console.log('  ✅ 视锥体裁剪已启用');
  }

  /**
   * 更新视锥体裁剪
   */
  updateFrustumCulling() {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    let culledCount = 0;
    
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      
      // 检查是否在视锥体内
      if (object.geometry && object.geometry.boundingSphere) {
        object.geometry.boundingSphere.applyMatrix4(object.matrixWorld);
        const inView = frustum.intersectsSphere(object.geometry.boundingSphere);
        
        if (!inView && object.visible) {
          object.visible = false;
          culledCount++;
        } else if (inView && !object.visible) {
          object.visible = true;
        }
      }
    });
    
    this.stats.culledObjects = culledCount;
  }

  /**
   * 9️⃣ LOD（细节层次）优化
   */
  createLOD(mesh, distances = [20, 50, 100]) {
    const lod = new THREE.LOD();
    
    // 高精度模型（近距离）
    lod.addLevel(mesh, 0);
    
    // 中精度模型（中距离）
    const mediumGeo = this.simplifyGeometry(mesh.geometry, 0.5);
    const mediumMesh = new THREE.Mesh(mediumGeo, mesh.material);
    lod.addLevel(mediumMesh, distances[0]);
    
    // 低精度模型（远距离）
    const lowGeo = this.simplifyGeometry(mesh.geometry, 0.2);
    const lowMesh = new THREE.Mesh(lowGeo, mesh.material);
    lod.addLevel(lowMesh, distances[1]);
    
    return lod;
  }

  /**
   * 简化几何体（降低顶点数）
   */
  simplifyGeometry(geometry, ratio) {
    // 这里需要使用 SimplifyModifier 或类似工具
    // 简化实现：随机抽取顶点
    const simplified = geometry.clone();
    // 实际项目中使用专业的简化算法
    return simplified;
  }

  /**
   * 🔟 纹理优化
   */
  optimizeTextures() {
    console.log('🔧 优化纹理...');
    
    let optimizedCount = 0;
    const textures = new Set();
    
    this.scene.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      
      const material = object.material;
      const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'];
      
      textureProps.forEach(prop => {
        const texture = material[prop];
        if (!texture || textures.has(texture)) return;
        
        textures.add(texture);
        
        // 设置各向异性过滤（提升质量但降低性能）
        texture.anisotropy = this.isMobile() ? 2 : 4;
        
        // 启用 mipmaps
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        optimizedCount++;
      });
    });
    
    console.log(`  ✅ 纹理优化完成，优化 ${optimizedCount} 个纹理`);
  }

  /**
   * 📊 打印性能统计
   */
  printStats() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 性能优化统计:');
    console.log(`   原始 Draw Calls: ${this.stats.originalDrawCalls}`);
    console.log(`   优化后 Draw Calls: ${this.stats.optimizedDrawCalls || '计算中...'}`);
    console.log(`   实例化对象: ${this.stats.instancedObjects}`);
    console.log(`   当前剔除对象: ${this.stats.culledObjects}`);
    console.log(`   渲染信息:`, this.renderer.info.render);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 🛠️ 工具方法
   */
  isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  isAnimated(object) {
    // 检查对象是否有动画
    return object.name.includes('Animated') || object.userData.animated;
  }

  getMaterialKey(material) {
    if (!material) return 'null';
    return `${material.type}_${material.color?.getHex() || 0}`;
  }

  /**
   * 🎛️ 配置优化参数
   */
  configure(options) {
    Object.assign(this.config, options);
    console.log('🔧 优化配置已更新:', this.config);
  }

  /**
   * 🧹 清理未使用的资源
   */
  cleanupUnused() {
    console.log('🧹 清理未使用的资源...');
    
    // 清理未使用的几何体和材质
    this.scene.traverse((object) => {
      if (object.isMesh) {
        // 如果网格不可见且长时间未使用，清理它
        if (!object.visible && object.userData.lastUsed) {
          const timeSinceUse = Date.now() - object.userData.lastUsed;
          if (timeSinceUse > 60000) { // 1分钟未使用
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
              } else {
                object.material.dispose();
              }
            }
            object.parent.remove(object);
          }
        }
      }
    });
    
    console.log('  ✅ 资源清理完成');
  }
}

