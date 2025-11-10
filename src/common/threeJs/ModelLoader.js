// 导入各种模型加载器和你自定义的模型封装类
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import DsModel from './DsModel';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// 模型加载类：支持 glTF/glb 和 FBX，支持 Draco 解码
import MaterialSharingOptimizer from './material-sharing-optimizer';
import MemoryOptimizer from './MemoryOptimizer';
export default class ModelLoader {
  // 构造函数：初始化加载器和解码器
  constructor(viewer) {
    this.viewer = viewer; // 存储传进来的 viewer 实例（包含 scene、camera、renderer 等）
    this.scene = viewer.scene; // 快捷引用场景对象
    // this.materialOptimizer = new MaterialSharingOptimizer(viewer.scene);
    this.memoryOptimizer = new MemoryOptimizer(viewer.scene, viewer.renderer);
    this.loaderGLTF = new GLTFLoader(); //  用于加载 .glb / .gltf 格式模型
    this.loaderGLTF.setMeshoptDecoder(MeshoptDecoder);
    this.loaderFBX = new FBXLoader();
    this.dracoLoader = new DRACOLoader();

    // 设置 Draco 解码器的路径（通常放在 public/js/draco 文件夹中）
    this.dracoLoader.setDecoderPath('/js/draco/');
    // 将 Draco 解码器绑定到 glTF 加载器
    this.loaderGLTF.setDRACOLoader(this.dracoLoader);
  }

  /**
   * 加载模型并添加到场景中
   * @param {string} url 模型文件路径
   * @param {Function} callback 模型加载成功后的回调，返回封装后的 DsModel 实例
   * @param {Function} progress 加载进度的回调（可选）
   */
  loadModelToScene(url, callback, progress) {
    this.loadModel(
      url,
      (model) => {
        // this.materialOptimizer.optimizeAll(model.object);
        this.scene.add(model.object);
  
        //      console.log('⚙️ 步骤2：配置优化参数');
        // this.memoryOptimizer.configure({
        //   maxTextureSize: 512, // 限制纹理尺寸
        //   simplifyGeometry: true, // 简化几何体
        //   simplificationRatio: 0.6, // 保留 60% 顶点
        //   enableUnloading: true, // 启用动态卸载
        //   unloadDistance: 80, // 80米外卸载
        //   autoCleanup: true, // 自动清理
        //   verbose: true // 打印详细日志
        // });
        // // 执行优化
        // this.memoryOptimizer.optimizeAll();

        //  启用动态卸载 先金庸
        // this.memoryOptimizer.enableDynamicUnloading(this.viewer.camera);

    
        callback?.(model); // 调用回调，传出模型对象
      },
      (num) => {
        progress?.(num); // 加载进度的回调
      }
    );
  }

  /**
   * 加载模型（不直接添加到场景中，单纯返回模型对象）
   * @param {string} url 模型路径
   * @param {Function} callback 加载完成回调
   * @param {Function} progress 加载进度回调（可选）
   */
  loadModel(url, callback, progress) {
    let loader = this.loaderGLTF; // 默认使用 GLTF 加载器
    if (url.indexOf('.fbx') !== -1) {
      // 如果是 .fbx 文件，改用 FBX 加载器
      loader = this.loaderFBX;
    }

    loader.load(
      url,
      (model) => {
        // 封装成 DsModel 实例后返回
        callback?.(new DsModel(model, this.viewer));
      },
      (xhr) => {
        // 加载进度：loaded / total（保留 2 位小数）
        progress?.((xhr.loaded / xhr.total).toFixed(2));
      },
      (error) => {
        console.error('模型渲染报错：', error);
      }
    );
  }
}
