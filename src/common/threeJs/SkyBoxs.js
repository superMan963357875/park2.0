import * as THREE from 'three';
// 天空盒时间类型
export const skyboxType = {
  day: 'day',
  // dusk: 'dusk',
  night: 'night'
};

export default class SkyBoxs {
  constructor(viewer) {
    this.viewer = viewer;
    this._cubeTexture = null;      
    // 缓存已加载的天空盒纹理
    this._textureCache = new Map();
    // 正在加载的 Promise防止我重复添加
    this._loadingPromises = new Map();
  }

//  获取天空盒路径
  _getSkyboxPaths(type) {
    return [
      `/images/skybox/${type}/posx.jpg`,
      `/images/skybox/${type}/negx.jpg`,
      `/images/skybox/${type}/posy.jpg`,
      `/images/skybox/${type}/negy.jpg`,
      `/images/skybox/${type}/posz.jpg`,
      `/images/skybox/${type}/negz.jpg`
    ];
  }

    // 为了防止切换场景出现严重卡顿 先预加载
  preloadSkybox(type = skyboxType.night) {
    // 如果已经缓存，直接返回
    if (this._textureCache.has(type)) {
      console.log(`✅ ${type} 天空盒已缓存，无需重复加载`);
      return Promise.resolve(this._textureCache.get(type));
    }

    // 如果正在加载，返回现有的_loadingPromises
    if (this._loadingPromises.has(type)) {
      return this._loadingPromises.get(type);
    }

    // 开始加载
    const loadPromise = new Promise((resolve, reject) => {
      const loader = new THREE.CubeTextureLoader();
      const paths = this._getSkyboxPaths(type);
      loader.load(
        paths,
        (cubeTexture) => {
          // 缓存纹理
          this._textureCache.set(type, cubeTexture);
          this._loadingPromises.delete(type);
          resolve(cubeTexture);
        },
        undefined,
        (error) => {
          this._loadingPromises.delete(type);
          console.error(`天空盒预加载失败:`, error);
          reject(error);
        }
      );
    });

    this._loadingPromises.set(type, loadPromise);
    return loadPromise;
  }

  //预先加载所有贴图
  async preloadAllSkyboxes() {
    const types = Object.values(skyboxType);
    try {
      await Promise.all(types.map(type => this.preloadSkybox(type)));
    } catch (error) {
      console.error('天空加载出错:', error);
    }
  }


  //  切换天空盒
  async setSkybox(type = skyboxType.day) {
    // 优先使用缓存
    if (this._textureCache.has(type)) {
      const cubeTexture = this._textureCache.get(type);
      this._cubeTexture = cubeTexture;
      this.viewer.scene.background = cubeTexture;
      this.viewer.scene.environment = cubeTexture;   
      return Promise.resolve();
    }

    if (this._loadingPromises.has(type)) {
      const cubeTexture = await this._loadingPromises.get(type);
  
      this._cubeTexture = cubeTexture;
      this.viewer.scene.background = cubeTexture;
      this.viewer.scene.environment = cubeTexture;
      
      return;
    }
    return new Promise((resolve, reject) => {
      const loader = new THREE.CubeTextureLoader();
      const paths = this._getSkyboxPaths(type);

      loader.load(
        paths,
        (cubeTexture) => {
          this._textureCache.set(type, cubeTexture);
          this._cubeTexture = cubeTexture;
          this.viewer.scene.background = cubeTexture;
          this.viewer.scene.environment = cubeTexture;
          
          this.viewer.renderer.render(this.viewer.scene, this.viewer.camera);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`❌ ${type} 天空盒加载失败:`, error);
          reject(error);
        }
      );
    });
  }

  setSkyboxSync(type = skyboxType.day) {
    this.setSkybox(type).catch(err => {
      console.error('setSkyboxSync error:', err);
    });
  }

  /**
   * 清理所有缓存的纹理
   */
  dispose() {
    // 释放所有缓存的纹理
    this._textureCache.forEach((texture, type) => {
      texture.dispose();
    });
    this._textureCache.clear(); 
    // 清空加载中的 Promise
    this._loadingPromises.clear();
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      cached: Array.from(this._textureCache.keys()),
      loading: Array.from(this._loadingPromises.keys()),
      current: this._cubeTexture ? '已设置' : '未设置'
    };
  }
}