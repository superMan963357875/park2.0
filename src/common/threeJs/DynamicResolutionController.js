import * as THREE from 'three';

/**
 * Three.js 动态渲染分辨率
 * 根据帧率自动调整渲染分辨率，保持流畅的用户体验
 * 
 * 核心原理：
 * 1. 实时监控帧率（FPS）
 * 2. FPS 低 → 降低分辨率（提升性能）
 * 3. FPS 高 → 提高分辨率（提升画质）
 * 4. 使用平滑算法避免频繁跳变
 */
export default class DynamicResolutionController {
  
  constructor(renderer, camera, options = {}) {
    this.renderer = renderer;
    this.camera = camera;
    // 基础配置 
    this.config = {
      // 分辨率范围
      minPixelRatio: options.minPixelRatio || 0.5,  // 最低分辨率
      maxPixelRatio: options.maxPixelRatio || Math.min(window.devicePixelRatio || 1, 2), // 最高分辨率
      
      // 目标帧率
      targetFPS: options.targetFPS || 55,            // 目标帧率
      minFPS: options.minFPS || 45,                  // 最低可接受帧率
      maxFPS: options.maxFPS || 60,                  // 最高帧率
      
      // 调整策略
      adjustInterval: options.adjustInterval || 60,  // 每 N 帧检测一次
      adjustStep: options.adjustStep || 0.05,        // 每次调整幅度
      smoothing: options.smoothing || 0.3,           // 平滑系数 (0-1)
      
      // 防抖配置
      debounceDelay: options.debounceDelay || 500,   // 防抖延迟（ms）
      stabilityFrames: options.stabilityFrames || 30, // 稳定帧数阈值
      
      // 模式配置
      mode: options.mode || 'auto',                  // 'auto' | 'fixed' | 'manual'
      aggressiveness: options.aggressiveness || 'balanced', // 'conservative' | 'balanced' | 'aggressive'
      
      // 调试选项
      showDebugInfo: options.showDebugInfo || false, // 显示调试信息
      verbose: options.verbose || false,             // 打印详细日志
    };
    
    // 运行时状态
    this.state = {
      enabled: false,                    // 是否启用
      currentPixelRatio: this.config.maxPixelRatio, // 当前分辨率
      targetPixelRatio: this.config.maxPixelRatio,  // 目标分辨率
      
      // FPS 统计
      frameCount: 0,                     // 帧计数
      fpsHistory: [],                    // FPS 历史记录
      currentFPS: 60,                    // 当前 FPS
      averageFPS: 60,                    // 平均 FPS
      
      // 时间追踪
      lastFrameTime: performance.now(),  // 上一帧时间
      lastAdjustTime: 0,                 // 上次调整时间
      deltaAccumulator: 0,               // 增量累加器
      
      // 稳定性检测
      isStable: false,                   // 帧率是否稳定
      stableFrameCount: 0,               // 稳定帧计数
      
      // 统计信息
      totalAdjustments: 0,               // 总调整次数
      increaseCount: 0,                  // 提升次数
      decreaseCount: 0,                  // 降低次数
    };
    
    // ==================== UI 元素（调试用） ====================
    this.debugPanel = null;
    if (this.config.showDebugInfo) {
      this.createDebugPanel();
    }
    
    // 初始化
    this.initialize();
  }

  /**
   * 🚀 初始化
   */
  initialize() {
    // 设置初始分辨率
    this.renderer.setPixelRatio(this.state.currentPixelRatio);
    
    if (this.config.verbose) {
      console.log('🎮 动态分辨率控制器已初始化');
      console.log('配置:', this.config);
    }
  }

  /**
   *  启用动态分辨率
   */
  enable() {
    if (this.state.enabled) return;
    
    this.state.enabled = true;
    this.state.lastFrameTime = performance.now();
    
    if (this.config.verbose) {
      console.log('✅ 动态分辨率已启用');
    }
  }

  /**
   * 禁用动态分辨率
   */
  disable() {
    if (!this.state.enabled) return;
    
    this.state.enabled = false;
    
    // 恢复到最高分辨率
    this.setPixelRatio(this.config.maxPixelRatio);
    
    if (this.config.verbose) {
      console.log('❌ 动态分辨率已禁用，恢复最高分辨率');
    }
  }

  /**
   * 🔄 更新（每帧调用）
   * @param {number} currentTime - 当前时间戳（performance.now()）
   */
  update(currentTime = performance.now()) {
    if (!this.state.enabled || this.config.mode === 'fixed') {
      return;
    }
    
    // ==================== 计算当前 FPS ====================
    const deltaTime = currentTime - this.state.lastFrameTime;
    this.state.lastFrameTime = currentTime;
    
    if (deltaTime > 0) {
      this.state.currentFPS = 1000 / deltaTime;
      
      // 记录 FPS 历史
      this.state.fpsHistory.push(this.state.currentFPS);
      if (this.state.fpsHistory.length > 60) {
        this.state.fpsHistory.shift();
      }
      
      // 计算平均 FPS
      this.state.averageFPS = this.state.fpsHistory.reduce((a, b) => a + b, 0) / this.state.fpsHistory.length;
    }
    
    // ==================== 增加帧计数 ====================
    this.state.frameCount++;
    
    // ==================== 检测并调整 ====================
    if (this.state.frameCount >= this.config.adjustInterval) {
      this.state.frameCount = 0;
      this.checkAndAdjust(currentTime);
    }
    
    // ==================== 平滑过渡 ====================
    this.smoothTransition();
    
    // ==================== 更新调试信息 ====================
    if (this.config.showDebugInfo) {
      this.updateDebugPanel();
    }
  }

  /**
   * 🔍 检测并调整分辨率
   * @param {number} currentTime - 当前时间戳
   */
  checkAndAdjust(currentTime) {
    const avgFPS = this.state.averageFPS;
    
    // 防抖：距离上次调整时间不足，跳过
    if (currentTime - this.state.lastAdjustTime < this.config.debounceDelay) {
      return;
    }
    
    // 检测帧率稳定性
    this.updateStability();
    
    // ==================== 根据策略模式调整 ====================
    const aggressiveness = this.config.aggressiveness;
    let shouldIncrease = false;
    let shouldDecrease = false;
    
    if (aggressiveness === 'conservative') {
      // 保守模式：只在帧率显著低于目标时降低
      shouldDecrease = avgFPS < this.config.minFPS;
      shouldIncrease = avgFPS > this.config.maxFPS && this.state.isStable;
    } else if (aggressiveness === 'balanced') {
      // 平衡模式：根据目标帧率调整
      shouldDecrease = avgFPS < this.config.targetFPS;
      shouldIncrease = avgFPS > this.config.targetFPS + 10 && this.state.currentPixelRatio < this.config.maxPixelRatio;
    } else if (aggressiveness === 'aggressive') {
      // 激进模式：快速响应帧率变化
      shouldDecrease = avgFPS < this.config.targetFPS + 5;
      shouldIncrease = avgFPS > this.config.targetFPS - 5;
    }
    
    // ==================== 执行调整 ====================
    if (shouldDecrease && this.state.currentPixelRatio > this.config.minPixelRatio) {
      this.decreaseResolution();
    } else if (shouldIncrease && this.state.currentPixelRatio < this.config.maxPixelRatio) {
      this.increaseResolution();
    }
  }

  /**
   * 📉 降低分辨率
   */
  decreaseResolution() {
    const newRatio = Math.max(
      this.config.minPixelRatio,
      this.state.currentPixelRatio - this.config.adjustStep
    );
    
    if (newRatio !== this.state.currentPixelRatio) {
      this.state.targetPixelRatio = newRatio;
      this.state.lastAdjustTime = performance.now();
      this.state.totalAdjustments++;
      this.state.decreaseCount++;
      
      if (this.config.verbose) {
        console.log(`📉 降低分辨率: ${this.state.currentPixelRatio.toFixed(2)}x → ${newRatio.toFixed(2)}x (FPS: ${this.state.averageFPS.toFixed(1)})`);
      }
    }
  }

  /**
   * 📈 提高分辨率
   */
  increaseResolution() {
    const newRatio = Math.min(
      this.config.maxPixelRatio,
      this.state.currentPixelRatio + this.config.adjustStep
    );
    
    if (newRatio !== this.state.currentPixelRatio) {
      this.state.targetPixelRatio = newRatio;
      this.state.lastAdjustTime = performance.now();
      this.state.totalAdjustments++;
      this.state.increaseCount++;
      
      if (this.config.verbose) {
        console.log(`📈 提高分辨率: ${this.state.currentPixelRatio.toFixed(2)}x → ${newRatio.toFixed(2)}x (FPS: ${this.state.averageFPS.toFixed(1)})`);
      }
    }
  }

  /**
   * 🎨 平滑过渡
   */
  smoothTransition() {
    if (this.state.currentPixelRatio === this.state.targetPixelRatio) {
      return;
    }
    
    // 使用 lerp 平滑插值
    const alpha = this.config.smoothing;
    const newRatio = THREE.MathUtils.lerp(
      this.state.currentPixelRatio,
      this.state.targetPixelRatio,
      alpha
    );
    
    // 如果差异很小，直接跳到目标值
    if (Math.abs(newRatio - this.state.targetPixelRatio) < 0.01) {
      this.state.currentPixelRatio = this.state.targetPixelRatio;
    } else {
      this.state.currentPixelRatio = newRatio;
    }
    
    // 应用新的分辨率
    this.renderer.setPixelRatio(this.state.currentPixelRatio);
  }

  /**
   * 📊 更新稳定性检测
   */
  updateStability() {
    const fpsVariance = this.calculateFPSVariance();
    
    // 方差小于阈值认为稳定
    const isStable = fpsVariance < 5;
    
    if (isStable) {
      this.state.stableFrameCount++;
    } else {
      this.state.stableFrameCount = 0;
    }
    
    // 连续稳定 N 帧才认为真正稳定
    this.state.isStable = this.state.stableFrameCount >= this.config.stabilityFrames;
  }

  /**
   * 📊 计算 FPS 方差
   */
  calculateFPSVariance() {
    if (this.state.fpsHistory.length < 10) return 0;
    
    const avg = this.state.averageFPS;
    const squareDiffs = this.state.fpsHistory.map(fps => {
      const diff = fps - avg;
      return diff * diff;
    });
    
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(variance);
  }

  /**
   * 🎯 手动设置固定分辨率
   * @param {number} pixelRatio - 像素比
   */
  setPixelRatio(pixelRatio) {
    const clamped = Math.max(
      this.config.minPixelRatio,
      Math.min(this.config.maxPixelRatio, pixelRatio)
    );
    
    this.state.currentPixelRatio = clamped;
    this.state.targetPixelRatio = clamped;
    this.renderer.setPixelRatio(clamped);
    
    if (this.config.verbose) {
      console.log(`🎯 手动设置分辨率: ${clamped.toFixed(2)}x`);
    }
  }

  /**
   * 🎛️ 配置参数
   * @param {Object} options - 配置选项
   */
  configure(options) {
    Object.assign(this.config, options);
    
    if (this.config.verbose) {
      console.log('🔧 配置已更新:', options);
    }
  }

  /**
   * 📊 获取当前状态
   * @returns {Object} 状态信息
   */
  getState() {
    return {
      enabled: this.state.enabled,
      currentPixelRatio: this.state.currentPixelRatio.toFixed(2),
      targetPixelRatio: this.state.targetPixelRatio.toFixed(2),
      currentFPS: this.state.currentFPS.toFixed(1),
      averageFPS: this.state.averageFPS.toFixed(1),
      isStable: this.state.isStable,
      totalAdjustments: this.state.totalAdjustments,
      increaseCount: this.state.increaseCount,
      decreaseCount: this.state.decreaseCount,
    };
  }

  /**
   * 📊 打印统计信息
   */
  printStats() {
    const state = this.getState();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 动态分辨率统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎮 当前分辨率: ${state.currentPixelRatio}x`);
    console.log(`🎯 目标分辨率: ${state.targetPixelRatio}x`);
    console.log(`📈 当前 FPS: ${state.currentFPS}`);
    console.log(`📊 平均 FPS: ${state.averageFPS}`);
    console.log(`✅ 稳定性: ${state.isStable ? '稳定' : '不稳定'}`);
    console.log(`🔄 调整次数: ${state.totalAdjustments} (↑${state.increaseCount} / ↓${state.decreaseCount})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 🖼️ 创建调试面板
   */
  createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 60px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      min-width: 200px;
      line-height: 1.5;
    `;
    document.body.appendChild(this.debugPanel);
  }

  /**
   * 🔄 更新调试面板
   */
  updateDebugPanel() {
    if (!this.debugPanel) return;
    
    const state = this.state;
    const quality = (state.currentPixelRatio / this.config.maxPixelRatio * 100).toFixed(0);
    
    this.debugPanel.innerHTML = `
      <div style="color: #fff; font-weight: bold; margin-bottom: 5px;">Dynamic Resolution</div>
      <div>FPS: <span style="color: ${state.currentFPS < 50 ? '#f00' : '#0f0'}">${state.currentFPS.toFixed(1)}</span> / ${this.config.targetFPS}</div>
      <div>Avg FPS: ${state.averageFPS.toFixed(1)}</div>
      <div>Resolution: ${state.currentPixelRatio.toFixed(2)}x (${quality}%)</div>
      <div>Mode: ${this.config.mode} (${this.config.aggressiveness})</div>
      <div>Stable: ${state.isStable ? '✅' : '❌'}</div>
      <div>Adjustments: ${state.totalAdjustments}</div>
    `;
  }

  /**
   * 🧹 销毁
   */
  dispose() {
    this.disable();
    
    if (this.debugPanel) {
      this.debugPanel.remove();
      this.debugPanel = null;
    }
    
    if (this.config.verbose) {
      console.log('🧹 动态分辨率控制器已销毁');
    }
  }
}

// ==================== 📝 使用示例 ====================
/*
import DynamicResolutionController from './DynamicResolutionController';

const viewer = new ThreeViewer(container);

// 方法1：简单使用（默认配置）
const resolutionController = new DynamicResolutionController(
  viewer.renderer,
  viewer.camera
);
resolutionController.enable();

// 在渲染循环中更新
viewer.addAnimate({
  fun: () => {
    resolutionController.update(performance.now());
  },
  content: null
});

// 方法2：自定义配置
const resolutionController = new DynamicResolutionController(
  viewer.renderer,
  viewer.camera,
  {
    minPixelRatio: 0.5,        // 最低 0.5x
    maxPixelRatio: 2.0,        // 最高 2x
    targetFPS: 55,             // 目标 55 FPS
    aggressiveness: 'balanced', // 平衡模式
    showDebugInfo: true,       // 显示调试信息
    verbose: true,             // 打印日志
  }
);
resolutionController.enable();

// 方法3：完整集成到 ThreeViewer
class ThreeViewer {
  constructor(container) {
    // ... 初始化代码
    
    // 初始化动态分辨率
    this.resolutionController = new DynamicResolutionController(
      this.renderer,
      this.camera,
      { showDebugInfo: true }
    );
    this.resolutionController.enable();
  }
  
  animate(currentTime) {
    // ... 其他代码
    
    // 更新动态分辨率
    this.resolutionController.update(currentTime);
    
    // ... 渲染代码
  }
}

// 方法4：运行时控制
resolutionController.enable();           // 启用
resolutionController.disable();          // 禁用
resolutionController.setPixelRatio(1.0); // 手动设置
resolutionController.printStats();       // 打印统计


*/