import * as THREE from 'three';

/**
 * 🎨 Three.js 材质共享优化工具
 * 自动检测和合并相同的材质，减少材质切换次数，提升渲染性能
 * 
 * 核心原理：
 * 1. 扫描场景中所有材质
 * 2. 根据材质属性（颜色、纹理、类型等）生成唯一标识
 * 3. 相同标识的材质合并为一个
 * 4. 让多个网格共享同一个材质实例
 */
export default class MaterialSharingOptimizer {
  
  constructor(scene) {
    this.scene = scene;
    
    // 配置
    this.config = {
      // 是否比较纹理（严格模式）
      compareTextures: true,
      
      // 是否比较精确颜色
      compareColors: true,
      
      // 容差值（颜色差异小于此值视为相同）
      colorTolerance: 0.01,
      
      // 是否保留原材质名称
      preserveNames: false,
      
      // 是否打印详细日志
      verbose: true,
    };
    
    // 统计信息
    this.stats = {
      originalMaterials: 0,   // 原始材质数量
      sharedMaterials: 0,     // 共享后材质数量
      savedMemory: 0,         // 节省的内存（估算）
      affectedMeshes: 0,      // 受影响的网格数量
    };
  }

  /**
   * 🚀 一键优化：自动共享所有材质
   * @param {THREE.Object3D} root - 要优化的对象（默认使用 scene）
   * @returns {Object} 优化统计信息
   */
  optimizeAll(root = null) {
    console.log('开始材质共享优化...');
    const startTime = performance.now();
    
    const targetRoot = root || this.scene;
    
    // 1. 收集所有材质
    const materials = this.collectMaterials(targetRoot);
    this.stats.originalMaterials = materials.length;
    
    if (this.config.verbose) {
      console.log(`收集到 ${materials.length} 个材质`);
    }
    
    // 2. 分组相同材质
    const groups = this.groupSimilarMaterials(materials);
    
    if (this.config.verbose) {
      console.log(`检测到 ${groups.length} 组相似材质`);
    }
    
    // 3. 替换材质
    const sharedCount = this.replaceMaterials(groups, targetRoot);
    this.stats.sharedMaterials = sharedCount;
    
    // 4. 计算节省的内存
    this.stats.savedMemory = this.estimateSavedMemory(
      this.stats.originalMaterials,
      this.stats.sharedMaterials
    );
    
    const duration = (performance.now() - startTime).toFixed(2);
    
    // 5. 打印报告
    this.printReport(duration);
    
    return this.stats;
  }

  /**
   * 📦 收集场景中的所有材质
   * @param {THREE.Object3D} root - 根对象
   * @returns {Array} 材质数组（包含使用该材质的网格引用）
   */
  collectMaterials(root) {
    const materials = [];
    
    root.traverse((object) => {
      if (object.isMesh && object.material) {
        const mats = Array.isArray(object.material) 
          ? object.material 
          : [object.material];
        
        mats.forEach((mat, index) => {
          materials.push({
            material: mat,
            mesh: object,
            index: index, // 多材质时的索引
          });
        });
      }
    });
    
    return materials;
  }

  /**
   * 🔍 将相似的材质分组
   * @param {Array} materials - 材质数组
   * @returns {Array} 分组后的材质数组
   */
  groupSimilarMaterials(materials) {
    const groups = new Map();
    
    materials.forEach((item) => {
      // 生成材质的唯一标识符
      const key = this.generateMaterialKey(item.material);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key).push(item);
    });
    
    // 只返回包含多个材质的组（可以共享的组）
    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  /**
   * 🔑 生成材质的唯一标识符
   * 基于材质的关键属性生成字符串 key
   * 
   * @param {THREE.Material} material - 材质对象
   * @returns {string} 唯一标识符
   */
  generateMaterialKey(material) {
    const parts = [];
    
    // 1. 材质类型
    parts.push(`type:${material.type}`);
    
    // 2. 基础颜色
    if (this.config.compareColors && material.color) {
      const color = material.color;
      const r = Math.round(color.r / this.config.colorTolerance);
      const g = Math.round(color.g / this.config.colorTolerance);
      const b = Math.round(color.b / this.config.colorTolerance);
      parts.push(`color:${r}-${g}-${b}`);
    }
    
    // 3. 纹理贴图
    if (this.config.compareTextures) {
      const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 
                            'emissiveMap', 'aoMap', 'bumpMap'];
      
      textureProps.forEach(prop => {
        const texture = material[prop];
        if (texture) {
          // 使用纹理的 UUID 作为标识
          parts.push(`${prop}:${texture.uuid}`);
        }
      });
    }
    
    // 4. 材质属性
    if (material.roughness !== undefined) {
      parts.push(`roughness:${material.roughness.toFixed(2)}`);
    }
    if (material.metalness !== undefined) {
      parts.push(`metalness:${material.metalness.toFixed(2)}`);
    }
    if (material.opacity !== undefined) {
      parts.push(`opacity:${material.opacity.toFixed(2)}`);
    }
    
    // 5. 透明度和双面渲染
    parts.push(`transparent:${material.transparent}`);
    parts.push(`side:${material.side}`);
    
    // 6. 发光颜色
    if (material.emissive) {
      const emissive = material.emissive;
      parts.push(`emissive:${emissive.getHex()}`);
    }
    
    return parts.join('|');
  }

  /**
   * 替换材质
   * @param {Array} groups - 分组后的材质数组
   * @param {THREE.Object3D} root - 根对象
   * @returns {number} 共享后的材质数量
   */
  replaceMaterials(groups, root) {
    let replacedCount = 0;
    const sharedMaterials = new Set();
    
    groups.forEach((group, groupIndex) => {
      // 使用组中第一个材质作为共享材质
      const sharedMaterial = group[0].material;
      sharedMaterials.add(sharedMaterial);
      
      if (this.config.verbose) {
        console.log(`\n材质组 ${groupIndex + 1}: ${group.length} 个网格使用相同材质`);
        console.log(`   材质类型: ${sharedMaterial.type}`);
        console.log(`   共享材质: ${sharedMaterial.name || sharedMaterial.uuid}`);
      }
      
      // 替换组中其他网格的材质
      for (let i = 1; i < group.length; i++) {
        const item = group[i];
        const mesh = item.mesh;
        const oldMaterial = item.material;
        
        // 替换材质
        if (Array.isArray(mesh.material)) {
          mesh.material[item.index] = sharedMaterial;
        } else {
          mesh.material = sharedMaterial;
        }
        
        // 释放旧材质
        if (!this.isMaterialUsedElsewhere(oldMaterial, root, mesh)) {
          oldMaterial.dispose();
        }
        
        replacedCount++;
        this.stats.affectedMeshes++;
        
        if (this.config.verbose && i <= 3) {
          console.log(`   替换网格: ${mesh.name || 'unnamed'}`);
        }
      }
      
      if (this.config.verbose && group.length > 4) {
        console.log(`   ... 还有 ${group.length - 4} 个网格`);
      }
    });
    
    return sharedMaterials.size;
  }

  /**
   * 🔍 检查材质是否在其他地方使用
   * @param {THREE.Material} material - 要检查的材质
   * @param {THREE.Object3D} root - 根对象
   * @param {THREE.Mesh} excludeMesh - 排除的网格
   * @returns {boolean} 是否在其他地方使用
   */
  isMaterialUsedElsewhere(material, root, excludeMesh) {
    let isUsed = false;
    
    root.traverse((object) => {
      if (object.isMesh && object !== excludeMesh && object.material) {
        const mats = Array.isArray(object.material) 
          ? object.material 
          : [object.material];
        
        if (mats.includes(material)) {
          isUsed = true;
        }
      }
    });
    
    return isUsed;
  }

  /**
   * 💾 估算节省的内存（MB）
   * @param {number} originalCount - 原始材质数量
   * @param {number} sharedCount - 共享后材质数量
   * @returns {number} 节省的内存（MB）
   */
  estimateSavedMemory(originalCount, sharedCount) {
    // 假设每个材质占用约 1KB 内存（包括 Shader、Uniform 等）
    const memoryPerMaterial = 0.001; // MB
    const savedMaterials = originalCount - sharedCount;
    return (savedMaterials * memoryPerMaterial).toFixed(2);
  }

  /**
   * 📊 打印优化报告
   * @param {number} duration - 优化耗时
   */
  printReport(duration) {
    const reductionPercent = (
      (1 - this.stats.sharedMaterials / this.stats.originalMaterials) * 100
    ).toFixed(1);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 材质共享优化报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 原始材质数量: ${this.stats.originalMaterials}`);
    console.log(`📊 共享后材质数量: ${this.stats.sharedMaterials}`);
    console.log(`📊 减少比例: ${reductionPercent}%`);
    console.log(`📊 受影响的网格: ${this.stats.affectedMeshes}`);
    console.log(`💾 节省内存: ${this.stats.savedMemory} MB (估算)`);
    console.log(`⏱️  优化耗时: ${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 性能提升预估
    const performanceGain = Math.min(reductionPercent * 0.5, 30);
    console.log(`\n💡 预估性能提升: +${performanceGain.toFixed(1)}% 帧率`);
  }

  /**
   * 🔧 配置优化参数
   * @param {Object} options - 配置选项
   */
  configure(options) {
    Object.assign(this.config, options);
    console.log('🔧 材质共享配置已更新:', this.config);
  }

  /**
   * 🎯 手动共享指定材质
   * 适用于你知道哪些材质应该共享的情况
   * 
   * @param {Array<THREE.Mesh>} meshes - 要共享材质的网格数组
   * @param {THREE.Material} sharedMaterial - 共享的材质（可选，默认使用第一个网格的材质）
   */
  shareMaterialManually(meshes, sharedMaterial = null) {
    if (meshes.length < 2) {
      console.warn('⚠️ 至少需要2个网格才能共享材质');
      return;
    }
    
    const material = sharedMaterial || meshes[0].material;
    
    console.log(`🔗 手动共享材质: ${material.name || material.uuid}`);
    
    meshes.forEach((mesh, index) => {
      if (index === 0 && !sharedMaterial) return; // 跳过第一个网格
      
      const oldMaterial = mesh.material;
      mesh.material = material;
      
      // 释放旧材质
      if (oldMaterial !== material) {
        oldMaterial.dispose();
      }
      
      console.log(`  ✅ 已应用到: ${mesh.name || 'unnamed'}`);
    });
  }

  /**
   * 📋 查看材质使用情况
   * 返回每个材质被多少个网格使用
   */
  getMaterialUsageReport() {
    const usage = new Map();
    
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const mats = Array.isArray(object.material) 
          ? object.material 
          : [object.material];
        
        mats.forEach((mat) => {
          if (!usage.has(mat.uuid)) {
            usage.set(mat.uuid, {
              material: mat,
              count: 0,
              meshes: [],
            });
          }
          
          const info = usage.get(mat.uuid);
          info.count++;
          info.meshes.push(object.name || 'unnamed');
        });
      }
    });
    
    // 转换为数组并排序
    const report = Array.from(usage.values())
      .sort((a, b) => b.count - a.count);
    
    return report;
  }

  /**
   * 📋 打印材质使用报告
   */
  printUsageReport() {
    const report = this.getMaterialUsageReport();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 材质使用情况报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`\n🔝 使用最多的 10 个材质:`);
    console.table(report.slice(0, 10).map(item => ({
      材质名称: item.material.name || '未命名',
      类型: item.material.type,
      使用次数: item.count,
      '示例网格': item.meshes.slice(0, 3).join(', '),
    })));
    
    console.log(`\n📊 总材质数: ${report.length}`);
    console.log(`📊 被多次使用的材质: ${report.filter(r => r.count > 1).length}`);
    console.log(`📊 只使用一次的材质: ${report.filter(r => r.count === 1).length}`);
  }
}

// ==================== 📝 使用示例 ====================
/*
import MaterialSharingOptimizer from './MaterialSharingOptimizer';

const viewer = new ThreeViewer(container);
const materialOptimizer = new MaterialSharingOptimizer(viewer.scene);

// 方法1：一键自动优化（最简单）
loader.loadModelToScene('/glb/园区924.glb', (model) => {
  // 模型加载完成后，自动共享材质
  materialOptimizer.optimizeAll(model.object);
});

// 方法2：自定义配置后优化
materialOptimizer.configure({
  compareTextures: true,     // 严格比较纹理
  compareColors: true,       // 比较颜色
  colorTolerance: 0.01,      // 颜色容差
  verbose: true,             // 打印详细日志
});
materialOptimizer.optimizeAll();

// 方法3：手动共享指定材质
const meshes = [mesh1, mesh2, mesh3];
materialOptimizer.shareMaterialManually(meshes);

// 方法4：查看材质使用情况
materialOptimizer.printUsageReport();
*/