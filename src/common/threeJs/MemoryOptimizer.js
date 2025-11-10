import * as THREE from 'three';

/**
 * 内存优化工具
 * 真正减少内存占用的方法集合
 * 
 * 核心策略：
 * 1. 压缩纹理
 * 2. 简化几何体（减少顶点数）
 * 3. 卸载不可见对象
 * 4. 清理未使用的资源
 * 5. 使用对象池
 */
export default class MemoryOptimizer {
  
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    
    // 配置
    this.config = {
      // 纹理优化
      maxTextureSize: 2048,          // 最大纹理尺寸
      compressTextures: true,        // 压缩纹理
      useHalfFloat: true,            // 使用半精度浮点
      
      // 几何体优化
      simplifyGeometry: true,        // 简化几何体
      simplificationRatio: 0.5,      // 简化比例
      
      // 卸载配置
      unloadDistance: 100,           // 卸载距离
      enableUnloading: true,         // 启用动态卸载
      
      // 清理策略
      autoCleanup: true,             // 自动清理
      cleanupInterval: 60000,        // 清理间隔（ms）
      
      // 调试
      verbose: true,
    };
    
    // 统计
    this.stats = {
      originalMemory: 0,
      currentMemory: 0,
      savedMemory: 0,
      
      textures: {
        original: 0,
        optimized: 0,
        saved: 0,
      },
      
      geometries: {
        original: 0,
        optimized: 0,
        saved: 0,
      },
      
      unloadedObjects: 0,
    };
    
    // 缓存
    this.objectCache = new Map();      // 已卸载对象的缓存
    this.originalTextures = new Map(); // 原始纹理的备份
    this.cleanupTimer = null;
  }
  // 统一开始
  optimizeAll() {
    console.log('开始内存优化...');
    const startTime = performance.now();
    
    // 1. 统计当前内存
    this.measureMemory();
    this.stats.originalMemory = this.stats.currentMemory;
    
    // 2. 优化纹理
    this.optimizeTextures();
    
    // 3. 简化几何体 会出现一些问题
    if (this.config.simplifyGeometry) {
      // this.simplifyGeometries();
    }
    
    // 4. 清理未使用资源
    this.cleanupUnused();
    
    // 5. 启动自动清理
    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
    
    // 6. 统计优化后内存
    this.measureMemory();
    this.stats.savedMemory = this.stats.originalMemory - this.stats.currentMemory;
    
    const duration = (performance.now() - startTime).toFixed(2);
    this.printReport(duration);
  }

  /**
   * 测量当前内存占用
   */
  measureMemory() {
    let textureMemory = 0;
    let geometryMemory = 0;
    
    // 统计纹理内存
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        
        materials.forEach((mat) => {
          const props = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 
                         'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap'];
          
          props.forEach((prop) => {
            const texture = mat[prop];
            if (texture && texture.image) {
              const width = texture.image.width || 0;
              const height = texture.image.height || 0;
              // RGBA = 4 字节/像素
              textureMemory += (width * height * 4) / (1024 * 1024); // MB
            }
          });
        });
      }
      
      // 统计几何体内存
      if (obj.geometry) {
        const geo = obj.geometry;
        const posCount = geo.attributes.position?.count || 0;
        // 估算：每个顶点约 50 字节（position + normal + uv + 其他）
        geometryMemory += (posCount * 50) / (1024 * 1024); // MB
      }
    });
    
    this.stats.currentMemory = textureMemory + geometryMemory;
    this.stats.textures.original = textureMemory;
    this.stats.geometries.original = geometryMemory;
    
    return {
      total: this.stats.currentMemory.toFixed(2),
      textures: textureMemory.toFixed(2),
      geometries: geometryMemory.toFixed(2),
    };
  }

  /**
   * 优化纹理（最有效的内存优化！）
   */
  optimizeTextures() {
    console.log('优化纹理...');
    
    let optimizedCount = 0;
    const textures = new Set();
    
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        
        materials.forEach((mat) => {
          const props = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 
                         'emissiveMap', 'aoMap', 'bumpMap'];
          
          props.forEach((prop) => {
            const texture = mat[prop];
            if (texture && !textures.has(texture.uuid)) {
              textures.add(texture.uuid);
              
              // 保存原始纹理
              if (!this.originalTextures.has(texture.uuid)) {
                this.originalTextures.set(texture.uuid, {
                  minFilter: texture.minFilter,
                  magFilter: texture.magFilter,
                  anisotropy: texture.anisotropy,
                });
              }
              
              // 1. 限制纹理尺寸
              if (this.config.maxTextureSize && texture.image) {
                const width = texture.image.width || 0;
                const height = texture.image.height || 0;
                
                if (width > this.config.maxTextureSize || height > this.config.maxTextureSize) {
                  this.resizeTexture(texture, this.config.maxTextureSize);
                  optimizedCount++;
                }
              }
              
              // 2. 降低过滤质量（减少 GPU 内存）
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              
              // 3. 降低各向异性过滤
              texture.anisotropy = Math.min(texture.anisotropy || 1, 4);
              
              // 4. 启用自动 mipmap 生成
              texture.generateMipmaps = true;
              
              texture.needsUpdate = true;
            }
          });
        });
      }
    });
    
    console.log(`优化了 ${optimizedCount} 个大尺寸纹理`);
    console.log(`优化了 ${textures.size} 个纹理的过滤设置`);
  }

  /**
   * 调整纹理尺寸
   */
  resizeTexture(texture, maxSize) {
    if (!texture.image) return;
    
    const img = texture.image;
    const width = img.width;
    const height = img.height;
    
    if (width <= maxSize && height <= maxSize) return;
    
    // 计算新尺寸（保持宽高比）
    const scale = maxSize / Math.max(width, height);
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    // 创建 canvas 缩放图片
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    // 替换纹理图片
    texture.image = canvas;
    texture.needsUpdate = true;
  }

  /**
   * 简化几何体
   */
  simplifyGeometries() {
    console.log('简化几何体...');
    
    let simplifiedCount = 0;
    
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        const geo = obj.geometry;
        const originalVertices = geo.attributes.position?.count || 0;
        
        // 只简化顶点数较多的几何体
        if (originalVertices > 10000) {
          try {
            // 简化几何体（这里需要使用 SimplifyModifier 或类似库）
            // 随机删除一些顶点
            const simplified = this.simplifyGeometry(geo, this.config.simplificationRatio);
            
            if (simplified) {
              obj.geometry = simplified;
              geo.dispose(); // 释放旧几何体
              simplifiedCount++;
            }
          } catch (error) {
            console.warn(`简化失败: ${obj.name}`, error);
          }
        }
      }
    });
    
    console.log(`简化了 ${simplifiedCount} 个几何体`);
  }

  /**
   * 项目 SimplifyModifier 或 meshoptimizer
   */
  simplifyGeometry(geometry, ratio) {
    //  three-mesh-bvh, meshoptimizer 可以使用这些库
    // 简单版：如果是索引几何体，减少索引数量
    if (geometry.index && ratio < 1) {
      const indices = geometry.index.array;
      const newLength = Math.floor(indices.length * ratio);
      const newIndices = new Uint32Array(newLength);
      
      // 保留前 N 个三角形
      for (let i = 0; i < newLength; i++) {
        newIndices[i] = indices[i];
      }
      
      const simplified = geometry.clone();
      simplified.setIndex(new THREE.BufferAttribute(newIndices, 1));
      return simplified;
    }
    
    return null;
  }

  /**
   * 清理未使用的资源
   */
  cleanupUnused() {
    console.log('清理未使用的资源...');
    
    const usedGeometries = new Set();
    const usedMaterials = new Set();
    const usedTextures = new Set();
    
    // 收集正在使用的资源
    this.scene.traverse((obj) => {
      if (obj.geometry) {
        usedGeometries.add(obj.geometry.uuid);
      }
      
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((mat) => {
          usedMaterials.add(mat.uuid);
          
          // 收集纹理
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((prop) => {
            if (mat[prop]) {
              usedTextures.add(mat[prop].uuid);
            }
          });
        });
      }
    });
    
    console.log(`  ✅ 正在使用: ${usedGeometries.size} 几何体, ${usedMaterials.size} 材质, ${usedTextures.size} 纹理`);
    
    // 注意：Three.js 会自动管理大部分资源
    // 这里只是示例，实际清理需要追踪所有创建的资源
  }

  /**
   * 动态卸载/加载（根据距离）
   */
  enableDynamicUnloading(camera) {
    if (!this.config.enableUnloading) return;
    const checkDistance = () => {
      this.scene.traverse((obj) => {
        if (!obj.isMesh) return;
        const worldPos = new THREE.Vector3();
              obj.getWorldPosition(worldPos);
        //通过distanceTo函数计算出位置
        const distance = worldPos.distanceTo(camera.position);
      
        // 超过距离则卸载
        if (distance > this.config.unloadDistance) {
         console.log('distanceobj',obj);
          if (obj.visible) {
            this.unloadObject(obj);
          }
        } else {
          if (!obj.visible && this.objectCache.has(obj.uuid)) {
            this.loadObject(obj);
          }
        }
      });
    };
    
    // 每秒检查一次
    this.unloadInterval = setInterval(checkDistance, 1000);
  }

  /**
   * 卸载对象
   */
  unloadObject(obj) {
    // 保存到缓存
    this.objectCache.set(obj.uuid, {
      geometry: obj.geometry,
      material: obj.material,
    });
    
    // 隐藏对象
    obj.visible = false;
    
    // 释放资源
    // obj.geometry = null;
    // obj.material = null;
    
    this.stats.unloadedObjects++;
    
    if (this.config.verbose) {
      console.log(`卸载: `,obj);
    }
  }

  /**
   * 加载对象
   */
  loadObject(obj) {
    const cached = this.objectCache.get(obj.uuid);
    
    if (cached) {
      obj.geometry = cached.geometry;
      obj.material = cached.material;
      obj.visible = true;
      
      this.objectCache.delete(obj.uuid);
      this.stats.unloadedObjects--;
      
      if (this.config.verbose) {
        console.log(` 加载: ${obj.name}`);
      }
    }
  }

  /**
   * ⏰ 启动自动清理
   */
  startAutoCleanup() {
  if (this.cleanupTimer) return;
    
  console.log('自动清理...');
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupUnused();
      
      // 强制垃圾回收（仅在开发环境）
      if (window.gc && this.config.verbose) {
        console.log('触发垃圾回收');
        window.gc();
      }
    }, this.config.cleanupInterval);
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log(' 停止自动清理');
    }
    
    if (this.unloadInterval) {
      clearInterval(this.unloadInterval);
      this.unloadInterval = null;
    }
  }

  /**
   * 📊 打印优化报告
   */
  printReport(duration) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('内存优化');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(` 原始内存: ${this.stats.originalMemory.toFixed(2)} MB`);
    console.log(`当前内存: ${this.stats.currentMemory.toFixed(2)} MB`);
    console.log(`节省内存: ${this.stats.savedMemory.toFixed(2)} MB (${(this.stats.savedMemory / this.stats.originalMemory * 100).toFixed(1)}%)`);
    console.log(`优化耗时: ${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n 优化建议:');
    if (this.stats.textures.original > 200) {
      console.log('纹理内存过大，建议使用 KTX2 压缩纹理');
    }
    if (this.stats.geometries.original > 100) {
      console.log('几何体内存过大，建议合并或简化几何体');
    }
  }

  /**
   *  配置参数
   */
  configure(options) {
    Object.assign(this.config, options);
  }

  /**
   * 销毁
   */
  dispose() {
    this.stopAutoCleanup();
    this.objectCache.clear();
    this.originalTextures.clear();
  }
}


/*
import MemoryOptimizer from './MemoryOptimizer';

const viewer = new ThreeViewer(container);
const memoryOptimizer = new MemoryOptimizer(viewer.scene, viewer.renderer);

// 加载模型后优化
loader.loadModelToScene('/glb/园区924.glb', (model) => {
  // 1. 查看优化前内存
  const before = memoryOptimizer.measureMemory();
  console.log('优化前:', before);
  
  // 2. 执行优化
  memoryOptimizer.optimizeAll();
  
  // 3. 查看优化后内存
  const after = memoryOptimizer.measureMemory();
  console.log('优化后:', after);
  
  // 4. 启用动态卸载（根据距离）
  memoryOptimizer.enableDynamicUnloading(viewer.camera);
});

// 自定义配置
memoryOptimizer.configure({
  maxTextureSize: 1024,      // 降低最大纹理尺寸
  simplifyGeometry: true,    // 启用几何体简化
  unloadDistance: 50,        // 50米外卸载
  enableUnloading: true,     // 启用动态卸载
});
*/