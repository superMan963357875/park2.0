// src/common/threeJs/utils/keyboard.js
import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

export function bindWASDControls(model, worldOctree, options = {}) {
  const {
    speed = 25,        // 地面速度 (unit/s)
    jumpSpeed = 15,    // 跳跃初速度
    gravity = 30,      // 重力加速度
    steps = 5,         // 帧内子步数
  } = options;

  // 挂载胶囊碰撞体（start, end, radius）
  const capsule = new Capsule(
    new THREE.Vector3(0, 0.35, 0),
    new THREE.Vector3(0, 1.0, 0),
    0.35
  );
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let onFloor = false;

  // 键盘状态
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false };
  window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; });
  window.addEventListener('keyup',   e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

  // PointerLock + 鼠标视角
  let pointerDown = false;
  const dom = model.rendererDomElement || document.body;
  dom.addEventListener('mousedown', () => {
    document.body.requestPointerLock();
    pointerDown = true;
  });
  dom.addEventListener('mouseup', () => { pointerDown = false; });
  document.body.addEventListener('mousemove', e => {
    if (!pointerDown) return;
    model.object.rotation.y -= e.movementX / 400;
    const cg = model.object.getObjectByName('cameraGroup');
    if (cg) {
      cg.rotation.x = THREE.MathUtils.clamp(
        cg.rotation.x - e.movementY / 400,
        THREE.MathUtils.degToRad(-30),
        THREE.MathUtils.degToRad(50)
      );
    }
  });

  // 每帧由外部调用：传入 deltaTime (s)
  function update(deltaTime) {
    // 子步模拟
    const dt = deltaTime / steps;
    for (let i = 0; i < steps; i++) {
      // 1. 处理输入
      //  摄像机方向的水平投影
      model.camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      const forward = direction.clone();
      const side    = direction.clone().cross(model.camera.up);

      const accel = new THREE.Vector3();
      if (keys.KeyW) accel.add(forward);
      if (keys.KeyS) accel.add(forward.clone().negate());
      if (keys.KeyA) accel.add(side.clone().negate());
      if (keys.KeyD) accel.add(side);

      if (accel.lengthSq() > 0) {
        accel.normalize().multiplyScalar(speed * dt);
        velocity.add(accel);
      }

      // 跳跃
      if (onFloor && keys.Space) {
        velocity.y = jumpSpeed;
        onFloor = false;
      }

      // 2. 应用重力 & 阻尼
      velocity.y -= gravity * dt;
      const damping = onFloor ? 1 : 0.1;
      velocity.x -= velocity.x * damping * dt * 4;
      velocity.z -= velocity.z * damping * dt * 4;

      // 3. 移动胶囊
      capsule.translate(velocity.clone().multiplyScalar(dt));

      // 4. 碰撞检测
      const res = worldOctree.capsuleIntersect(capsule);
      onFloor = false;
      if (res) {
        // 判断是否着地
        if (res.normal.y > 0) onFloor = true;
        // 如果在空中，把沿法线分量剔除
        if (!onFloor) {
          velocity.addScaledVector(res.normal, -res.normal.dot(velocity));
        }
        // 推离穿透
        if (res.depth > 1e-5) {
          capsule.translate(res.normal.multiplyScalar(res.depth));
        }
      }

      // 5. 同步相机位置到胶囊顶端
      model.camera.position.copy(capsule.end);
    }
  }

  return { update };
}
