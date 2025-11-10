import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// ✅ 正确的导入方式：使用 * as 导入整个模块
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import DsModel from './DsModel'

/**
 * 模型加载器类：支持 glTF/glb 和 FBX 格式
 * 支持 Draco 几何压缩、Meshopt 压缩
 * 🚀 新增：自动合并几何体以提升性能
 */
export default class ModelLoader {
  
  constructor(viewer) {
    this.viewer = viewer              // 存储 viewer 实例（包含 scene、camera、renderer）
    this.scene = viewer.scene         // 场景对象引用

    // ==================== 初始化 glTF 加载器 ====================
    this.loaderGLTF = new GLTFLoader()
    this.loaderGLTF.setMeshoptDecoder(MeshoptDecoder); // 支持 Meshopt 压缩

    // ==================== 初始化 FBX 加载器 ====================
    this.loaderFBX = new FBXLoader()

    // ==================== 初始化 Draco 解码器 ====================
    this.dracoLoader = new DRACOLoader()
    this.dracoLoader.setDecoderPath('/js/draco/')
    this.loaderGLTF.setDRACOLoader(this.dracoLoader)

    // ==================== 🚀 几何体合并配置 ====================
    this.mergeConfig = {
      enabled: true,                    // 是否启用几何体合并
      maxVertices: 65535,               // 单个合并几何体最大顶点数（WebGL 限制）
      preserveShadows: true,            // 是否保留阴影设置
      mergeByMaterial: true,            // 按材质分组合并（相同材质的网格合并在一起）
      minMeshCount: 3,                  // 至少有 N 个网格才执行合并（避免不必要的合并）
      excludeNames: [],                 // 排除列表：名称包含这些关键字的网格不参与合并
      logStats: true,                   // 是否打印合并统计信息
    };
  }

  /**
   * 加载模型并添加到场景中
   * @param {string} url - 模型文件路径
   * @param {Function} callback - 加载成功回调，返回 DsModel 实例
   * @param {Function} progress - 加载进度回调（可选）
   */
  loadModelToScene(url, callback, progress) {
    this.loadModel(url, model => {
      this.scene.add(model.object)     
      callback?.(model)                
    }, progress)
  }

  /**
   * 加载模型（不自动添加到场景，返回模型对象）
   * @param {string} url - 模型路径
   * @param {Function} callback - 加载完成回调
   * @param {Function} progress - 加载进度回调
   */
  loadModel(url, callback, progress) {
    console.log(`🚀 开始加载模型: ${url}`);
    
    // 根据文件扩展名选择加载器
    let loader = this.loaderGLTF
    if (url.indexOf('.fbx') !== -1) {
      loader = this.loaderFBX
    }

    loader.load(
      url,
      (model) => {
        console.log('✅ 模型加载成功');
        
        // ==================== 🚀 合并几何体优化 ====================
        if (this.mergeConfig.enabled) {
          this.mergeGeometries(model);
        }

        // 封装成 DsModel 实例
        const dsModel = new DsModel(model, this.viewer);
        callback?.(dsModel);
      },
      (xhr) => {
        // 加载进度
        const percent = (xhr.loaded / xhr.total).toFixed(2);
        progress?.(percent);
      },
      (error) => {
        console.error('❌ 模型加载失败:', error);
      }
    );
  }

  /**
   * 🚀 核心方法：合并几何体
   * 原理：
   * 1. 遍历模型中的所有网格（Mesh）
   * 2. 按材质分组（相同材质的网格可以合并）
   * 3. 使用 BufferGeometryUtils.mergeGeometries 合并几何体
   * 4. 用合并后的网格替换原始网格，减少 Draw Call
   * 
   * @param {Object} model - 加载后的模型对象（glTF 或 FBX）
   */
  mergeGeometries(model) {
    console.log('🔧 开始几何体合并优化...');
    
    const startTime = performance.now();
    const config = this.mergeConfig;
    
    // 获取模型根节点（glTF 的 scene 或 FBX 的根对象）
    const root = model.scene || model;
    
    // ==================== 步骤1：收集所有可合并的网格 ====================
    const meshMap = new Map(); // key: 材质ID, value: [mesh1, mesh2, ...]
    let totalMeshes = 0;
    let excludedMeshes = 0;

    root.traverse((child) => {
      // 只处理 Mesh 对象
      if (!child.isMesh) return;
      
      totalMeshes++;

      // 检查是否在排除列表中
      const isExcluded = config.excludeNames.some(name => 
        child.name.toLowerCase().includes(name.toLowerCase())
      );
      
      if (isExcluded) {
        excludedMeshes++;
        return;
      }

      // 按材质分组
      if (config.mergeByMaterial) {
        const material = child.material;
        const materialId = this.getMaterialId(material);
        
        if (!meshMap.has(materialId)) {
          meshMap.set(materialId, []);
        }
        meshMap.get(materialId).push(child);
      } else {
        // 不按材质分组，全部放在一起
        if (!meshMap.has('all')) {
          meshMap.set('all', []);
        }
        meshMap.get('all').push(child);
      }
    });

    // ==================== 步骤2：对每组材质进行合并 ====================
    let mergedCount = 0;
    let savedDrawCalls = 0;

    meshMap.forEach((meshes, materialId) => {
      // 如果该组网格数量少于阈值，跳过合并
      if (meshes.length < config.minMeshCount) {
        return;
      }

      console.log(`📦 合并材质组 [${materialId}]: ${meshes.length} 个网格`);

      try {
        // 准备合并的几何体数组
        const geometries = [];
        const firstMesh = meshes[0];
        const sharedMaterial = firstMesh.material;
        let castShadow = false;
        let receiveShadow = false;

        // 收集几何体并应用世界变换
        meshes.forEach((mesh) => {
          // 克隆几何体避免影响原始数据
          const geometry = mesh.geometry.clone();
          
          // 应用网格的世界变换矩阵到几何体顶点
          mesh.updateMatrixWorld(true);
          geometry.applyMatrix4(mesh.matrixWorld);
          
          geometries.push(geometry);

          // 记录阴影设置
          if (mesh.castShadow) castShadow = true;
          if (mesh.receiveShadow) receiveShadow = true;

          // 从场景中移除原网格
          if (mesh.parent) {
            mesh.parent.remove(mesh);
          }
        });

        // ==================== 执行几何体合并 ====================
        const mergedGeometry = this.mergeBufferGeometries(geometries, config.maxVertices);
        
        if (!mergedGeometry) {
          console.warn(`⚠️ 材质组 [${materialId}] 合并失败`);
          return;
        }

        // ==================== 创建合并后的网格 ====================
        const mergedMesh = new THREE.Mesh(mergedGeometry, sharedMaterial);
        mergedMesh.name = `Merged_${materialId}`;
        
        // 恢复阴影设置
        if (config.preserveShadows) {
          mergedMesh.castShadow = castShadow;
          mergedMesh.receiveShadow = receiveShadow;
        }

        // 添加到场景根节点
        root.add(mergedMesh);

        // 统计信息
        mergedCount++;
        savedDrawCalls += meshes.length - 1;

        console.log(`✅ 合并成功: ${meshes.length} → 1 (节省 ${meshes.length - 1} 次 Draw Call)`);

      } catch (error) {
        console.error(`❌ 材质组 [${materialId}] 合并失败:`, error);
      }
    });

    // ==================== 打印统计信息 ====================
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    if (config.logStats) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 几何体合并统计:');
      console.log(`   原始网格数量: ${totalMeshes}`);
      console.log(`   排除网格数量: ${excludedMeshes}`);
      console.log(`   合并组数: ${mergedCount}`);
      console.log(`   节省 Draw Calls: ${savedDrawCalls}`);
      console.log(`   处理耗时: ${duration}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * 🔧 标准化几何体属性
   * 确保所有几何体具有相同的属性，避免合并时出错
   * 
   * @param {Array<THREE.BufferGeometry>} geometries - 几何体数组
   * @returns {Array<THREE.BufferGeometry>} 标准化后的几何体数组
   */
  normalizeGeometries(geometries) {
    if (geometries.length === 0) return [];

    // ==================== 步骤1：检测所有几何体的属性 ====================
    const allAttributes = new Set();
    geometries.forEach(geo => {
      Object.keys(geo.attributes).forEach(attr => allAttributes.add(attr));
    });

    console.log(`🔍 检测到的属性: ${Array.from(allAttributes).join(', ')}`);

    // ==================== 步骤2：标准化每个几何体 ====================
    const normalized = geometries.map((geo, index) => {
      const cloned = geo.clone();
      
      // 添加缺失的属性（填充默认值）
      allAttributes.forEach(attrName => {
        if (!cloned.attributes[attrName]) {
          const vertexCount = cloned.attributes.position.count;
          
          // 根据属性类型创建默认值
          if (attrName === 'uv' || attrName === 'uv1' || attrName === 'uv2') {
            // UV 属性：填充 (0, 0)
            const uvArray = new Float32Array(vertexCount * 2);
            cloned.setAttribute(attrName, new THREE.BufferAttribute(uvArray, 2));
            console.log(`  ➕ [${index}] 添加缺失的 ${attrName} 属性`);
          } 
          else if (attrName === 'normal') {
            // 法线属性：计算法线
            cloned.computeVertexNormals();
            console.log(`  ➕ [${index}] 计算缺失的 normal 属性`);
          }
          else if (attrName === 'color') {
            // 颜色属性：填充白色
            const colorArray = new Float32Array(vertexCount * 3).fill(1.0);
            cloned.setAttribute(attrName, new THREE.BufferAttribute(colorArray, 3));
            console.log(`  ➕ [${index}] 添加缺失的 color 属性`);
          }
          else if (attrName === 'tangent') {
            // 切线属性：填充默认值
            const tangentArray = new Float32Array(vertexCount * 4);
            for (let i = 0; i < vertexCount; i++) {
              tangentArray[i * 4] = 1;     // x
              tangentArray[i * 4 + 1] = 0; // y
              tangentArray[i * 4 + 2] = 0; // z
              tangentArray[i * 4 + 3] = 1; // w
            }
            cloned.setAttribute(attrName, new THREE.BufferAttribute(tangentArray, 4));
            console.log(`  ➕ [${index}] 添加缺失的 tangent 属性`);
          }
        }
      });

      return cloned;
    });

    return normalized;
  }

  /**
   * 合并多个 BufferGeometry
   * 处理顶点数限制（单个几何体最多 65535 个顶点）
   * 
   * @param {Array<THREE.BufferGeometry>} geometries - 要合并的几何体数组
   * @param {number} maxVertices - 最大顶点数
   * @returns {THREE.BufferGeometry} 合并后的几何体
   */
  mergeBufferGeometries(geometries, maxVertices) {
    if (geometries.length === 0) return null;
    if (geometries.length === 1) return geometries[0];

    // ==================== 🔧 步骤1：标准化几何体属性 ====================
    console.log(`🔧 标准化 ${geometries.length} 个几何体的属性...`);
    geometries = this.normalizeGeometries(geometries);

    // ==================== 步骤2：检查顶点数限制 ====================
    let totalVertices = 0;
    geometries.forEach(geo => {
      totalVertices += geo.attributes.position.count;
    });

    // 如果超过顶点限制，分批合并
    if (totalVertices > maxVertices) {
      console.warn(`⚠️ 总顶点数 ${totalVertices} 超过限制 ${maxVertices}，将分批处理`);
      
      const batch = [];
      let currentVertices = 0;
      
      for (const geo of geometries) {
        const vertexCount = geo.attributes.position.count;
        if (currentVertices + vertexCount > maxVertices) break;
        batch.push(geo);
        currentVertices += vertexCount;
      }
      
      if (batch.length === 0) {
        console.error('❌ 单个几何体顶点数超限，无法合并');
        return null;
      }
      
      geometries = batch;
      console.log(`✂️ 截取前 ${batch.length} 个几何体进行合并`);
    }

    // ==================== 步骤3：执行合并 ====================
    try {
      console.log(`🔗 正在合并 ${geometries.length} 个几何体...`);
      const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
      
      if (!merged) {
        console.error('❌ 合并返回 null');
        return null;
      }
      
      console.log(`✅ 合并成功: ${totalVertices} 个顶点`);
      return merged;
    } catch (error) {
      console.error('❌ BufferGeometryUtils.mergeGeometries 失败:', error);
      console.error('错误详情:', error.message);
      return null;
    }
  }

  /**
   * 获取材质的唯一标识符
   * 用于分组相同材质的网格
   * 
   * @param {THREE.Material} material - 材质对象
   * @returns {string} 材质ID
   */
  getMaterialId(material) {
    if (Array.isArray(material)) {
      // 多材质网格：使用所有材质 UUID 组合
      return material.map(m => m.uuid).join('_');
    }
    // 单材质：直接使用 UUID
    return material.uuid || 'unknown';
  }

  /**
   * 🎛️ 配置几何体合并参数
   * 
   * @param {Object} options - 配置项
   * @param {boolean} options.enabled - 是否启用合并
   * @param {boolean} options.mergeByMaterial - 是否按材质分组
   * @param {number} options.minMeshCount - 最小合并网格数
   * @param {Array<string>} options.excludeNames - 排除的网格名称关键字
   */
  configureMerge(options) {
    Object.assign(this.mergeConfig, options);
    console.log('🔧 几何体合并配置已更新:', this.mergeConfig);
  }

  /**
   * 🚫 禁用几何体合并
   */
  disableMerge() {
    this.mergeConfig.enabled = false;
    console.log('❌ 几何体合并已禁用');
  }

  /**
   * ✅ 启用几何体合并
   */
  enableMerge() {
    this.mergeConfig.enabled = true;
    console.log('✅ 几何体合并已启用');
  }
}

// ==================== 📝 使用说明 ====================
// 1. 导入方式已修复，无需额外操作
// 2. 如果仍然报错，请检查 Three.js 版本（建议 >= r128）
// 3. 如需手动合并，可以这样调用：
//    import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
//    const merged = BufferGeometryUtils.mergeGeometries([geo1, geo2], false);