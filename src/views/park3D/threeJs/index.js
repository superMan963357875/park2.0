import * as THREE from 'three';
let modelRef = null
let viewerRef = null
let labelIns =null
let _box = new THREE.Box3();
let _centerVec = new THREE.Vector3();
let _sizeVec = new THREE.Vector3();
let _createdTags = new Map(); // 存储已创建标签，删除
let scanAnimateObj = null
let arrowGroup=null
let _labelTemplate = `
  <div class="label">
    <img id="u233_img" class="img" src="/assets/label.svg" tabindex="0" />
    <span class="labelText">{{TEXT}}</span>
  </div>
`.trim();
export function setModel(viewer,obj,labelIn) {
  modelRef = obj;        
  viewerRef = viewer || null;
  labelIns=labelIn
}
export function switchScene(value, skyBoxs, DirectionalLight, viewer, Model) {
  if (value == 'night') {
    viewer.unrealBloomPass.threshold=0.75
    skyBoxs.setSkybox('night');
    DirectionalLight.setOption({ intensity: 0 });
  
 
  } else if (value == 'day') {
    viewer.unrealBloomPass.threshold=1
    skyBoxs.setSkybox('day');

    DirectionalLight.setOption({ intensity: 2 });
  
   
  }
}

// 控制开关
export function switchLight(value,flag) { 
    let name = modelRef.getObjectByName(value)
    console.log('我看了那看',name,flag);
    if (flag) {
        name.visible = true
    } else { 
        name.visible = false
    }
}
let cameraAnimation = null
// 开门动画 现在直接写死  
export function changeDoorFn(value, flag) {
  console.log('modelRef, viewerRef', modelRef, viewerRef);

  const clipName = '门禁门Action';
  const cameraNodeName = 'door摄像头';

  const cameraClipIndex = modelRef.model.animations.findIndex(clip => clip.name === clipName);
  if (cameraClipIndex === -1) {
    console.error(`找不到 ${clipName} 的动画`);
    return;
  }

  const cameraInGLB = modelRef.getObjectByName(cameraNodeName);
  if (!cameraInGLB) {
    console.error(`找不到 ${cameraNodeName} 节点`);
    return;
  }

  // 启动相机跟随动画
  let cameraAnimationHandle= null;
  cameraAnimationHandle = modelRef.viewer.addAnimate({
    content: modelRef.viewer.camera,
    fun: () => {
      console.log('我有被销毁吗？');
      cameraInGLB.updateMatrixWorld(true);
      cameraInGLB.getWorldPosition(modelRef.viewer.camera.position);
      cameraInGLB.getWorldQuaternion(modelRef.viewer.camera.quaternion);
      if ((cameraInGLB ).isCamera && (cameraInGLB ).fov != null) {
        modelRef.viewer.camera.fov = (cameraInGLB ).fov;
        modelRef.viewer.camera.updateProjectionMatrix();
      }

      const dir = new THREE.Vector3();
      cameraInGLB.getWorldDirection(dir);
      const targetPos = modelRef.viewer.camera.position.clone().add(dir);

      if (modelRef.viewer.controls) {
        modelRef.viewer.controls.target.copy(targetPos);
        modelRef.viewer.controls.update();
      }
      return true; 
    }
  });

  // 播放门的动画，并在结束时移除相机跟随动画
  modelRef.startAnimal(cameraClipIndex, () => {
    if (modelRef.viewer.removeAnimate) {
      modelRef.viewer.removeAnimate(cameraAnimationHandle);
    } else if (cameraAnimationHandle?.stop) {
      cameraAnimationHandle.stop();
    } else {
      cameraAnimationHandle.enabled = false;
    }
    cameraAnimationHandle = null;
  });
}
// 道闸
export function changeBuildingFn(value, flag) {
  console.log('modelRef, viewerRef', modelRef, viewerRef);

  const clipName = '园区南门道闸-进-栏杆';
  const cameraNodeName = 'door摄像头';

  const cameraClipIndex = modelRef.model.animations.findIndex(clip => clip.name === clipName);
  if (cameraClipIndex === -1) {
    console.error(`找不到 ${clipName} 的动画`);
    return;
  }

  modelRef.startAnimal(cameraClipIndex, () => {
    if (modelRef.viewer.removeAnimate) {
      modelRef.viewer.removeAnimate(cameraAnimationHandle);
    } else if (cameraAnimationHandle?.stop) {
      cameraAnimationHandle.stop();
    } else {
      cameraAnimationHandle.enabled = false;
    }
    cameraAnimationHandle = null;
  });
}
// 电梯动画 现在直接写死 不需要传值  
export function changeLiftFn(value, flag) {
  console.log('modelRef, viewerRef', modelRef, viewerRef);
  const clipName = '电梯1内Action';
  const cameraNodeName = '电梯1内';

  const cameraClipIndex = modelRef.model.animations.findIndex(clip => clip.name === clipName);
  if (cameraClipIndex === -1) {
    console.error(`找不到 ${clipName} 的动画`);
    return;
  }

  const cameraInGLB = modelRef.getObjectByName(cameraNodeName);
  if (!cameraInGLB) {
    console.error(`找不到 ${cameraNodeName} 节点`);
    return;
  }
  // makeWireframe(cameraInGLB, 0x3A86FF, 1);
  // 播放门的动画，并在结束时移除相机跟随动画
 modelRef.startAnimal(cameraClipIndex, { loop: 'repeat' });
}
// 园区巡检功能
export function CarExamine(value, flag) {
  console.log('modelRef, viewerRef', modelRef, viewerRef);

  const clipName = '车1Action';
  const cameraNodeName = '车1摄像机';
  const clipName1 = '园区南门道闸-进-栏杆';
  const clipName2 = '园区北门道闸-出-栏杆';
  
  const cameraClipIndex = modelRef.model.animations.findIndex(clip => clip.name === clipName);
  const cameraClipIndex1 = modelRef.model.animations.findIndex(clip => clip.name === clipName1);
  const cameraClipIndex2 = modelRef.model.animations.findIndex(clip => clip.name === clipName2);
  
  if (cameraClipIndex === -1 || cameraClipIndex1 === -1 || cameraClipIndex2 === -1) {
    console.error('动画索引:', { cameraClipIndex, cameraClipIndex1, cameraClipIndex2 });
    return;
  }

  const cameraInGLB = modelRef.getObjectByName(cameraNodeName);
  if (!cameraInGLB) {
    console.error(`找不到 ${cameraNodeName} 节点`);
    return;
  }

  // 获取车对象
  const carObject = modelRef.getObjectByName('车1');
  if (!carObject) {
    console.warn('找不到车对象，俯视功能可能不准确');
  }

  // 相机状态管理
  let cameraAnimationHandle = null;
  let isOverheadView = false;
  let isTransitioning = false;
  let transitionProgress = 0;
  let transitionStartTime = 0;
  let overheadViewStartTime = 0;
  
  // 过渡参数
  const transitionDuration = 1500; // 过渡时间1.5秒
  const overheadViewDuration = 3000; // 俯视持续时间3秒
  
  // 相机状态
  let startPosition = null;
  let startTarget = null;
  let endPosition = null;
  let endTarget = null;
  let isTransitioningToOverhead = true; // true: 切换到俯视, false: 切回跟随

  // 缓动函数 - 平滑过渡
  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // 开始相机过渡
  const startCameraTransition = (toOverhead) => {
    if (isTransitioning) return;
    
    isTransitioning = true;
    isTransitioningToOverhead = toOverhead;
    transitionProgress = 0;
    transitionStartTime = performance.now();
    
    // 保存起始状态
    startPosition = modelRef.viewer.camera.position.clone();
    if (modelRef.viewer.controls) {
      startTarget = modelRef.viewer.controls.target.clone();
    }
    
    if (toOverhead) {
      // 切换到俯视
      console.log('开始切换到俯视视角...');
      if (carObject) {
        carObject.updateMatrixWorld(true);
        const carPosition = new THREE.Vector3();
        carObject.getWorldPosition(carPosition);
        
        endPosition = carPosition.clone();
        endPosition.y += 40;
        endPosition.z += 20;
        endTarget = carPosition.clone();
      }
    } else {
      // 切回跟随
      console.log('为啥不切会视角...');
      // 这里跟随模式下动态计算目标位置
      endPosition = null; // 跟随模式下位置由相机跟随控制
      endTarget = null;
    }
  };

  // 更新相机过渡
  const updateCameraTransition = () => {
    if (!isTransitioning) return;
    
    const currentTime = performance.now();
    const elapsed = currentTime - transitionStartTime;
    const progress = Math.min(elapsed / transitionDuration, 1);
    
    // 使用缓动函数
    const easedProgress = easeInOutCubic(progress);
    
    if (isTransitioningToOverhead) {
      // 过渡到俯视
      if (endPosition && endTarget) {
        modelRef.viewer.camera.position.lerpVectors(startPosition, endPosition, easedProgress);
        if (modelRef.viewer.controls) {
          modelRef.viewer.controls.target.lerpVectors(startTarget, endTarget, easedProgress);
          modelRef.viewer.controls.update();
        }
      }
    } else {
      // 过渡回跟随（这里我们让相机跟随重新接管）
      // 过渡完成后，相机跟随会自动接管
    }
    
    if (progress >= 1) {
      // 过渡完成
      isTransitioning = false;
      transitionProgress = 0;
      
      if (isTransitioningToOverhead) {
        isOverheadView = true;
        overheadViewStartTime = currentTime;
        console.log('俯视视角切换完成');
      } else {
        isOverheadView = false;
        console.log('跟随视角切换完成');
        // 重新启动相机跟随
        startCameraFollow();
      }
    }
  };

  // 相机跟随函数
  const startCameraFollow = () => {
    if (cameraAnimationHandle) {
      if (modelRef.viewer.removeAnimate) {
        modelRef.viewer.removeAnimate(cameraAnimationHandle);
      }
      cameraAnimationHandle = null;
    }
    
    cameraAnimationHandle = modelRef.viewer.addAnimate({
      content: modelRef.viewer.camera,
      fun: () => {
        if (isOverheadView || isTransitioning) {
          // 俯视模式或过渡模式下不更新相机跟随
          return true;
        }
        
        cameraInGLB.updateMatrixWorld(true);
        cameraInGLB.getWorldPosition(modelRef.viewer.camera.position);
        cameraInGLB.getWorldQuaternion(modelRef.viewer.camera.quaternion);
        
        if (cameraInGLB.isCamera && cameraInGLB.fov != null) {
          modelRef.viewer.camera.fov = cameraInGLB.fov;
          modelRef.viewer.camera.updateProjectionMatrix();
        }

        const dir = new THREE.Vector3();
        cameraInGLB.getWorldDirection(dir);
        const targetPos = modelRef.viewer.camera.position.clone().add(dir);

        if (modelRef.viewer.controls) {
          modelRef.viewer.controls.target.copy(targetPos);
          modelRef.viewer.controls.update();
        }
        return true; 
      }
    });
  };

  // 启动相机跟随
  startCameraFollow();

  // 使用固定的时间
  const fixedDeltaTime = 1/60;
  
  // 直接使用 Three.js 动画系统
  if (!modelRef.mixer) {
    modelRef.mixer = new THREE.AnimationMixer(modelRef.object);
  }

  // 清理之前的动画
  modelRef.mixer.stopAllAction();

  // 创建所有动画动作
  const carAction = modelRef.mixer.clipAction(modelRef.model.animations[cameraClipIndex]);
  const gate1Action = modelRef.mixer.clipAction(modelRef.model.animations[cameraClipIndex1]);
  const gate2Action = modelRef.mixer.clipAction(modelRef.model.animations[cameraClipIndex2]);

  // 配置动画
  [carAction, gate1Action, gate2Action].forEach(action => {
    action.reset();
    action.clampWhenFinished = true;
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.setLoop(THREE.LoopOnce, 0);
    action.play();
  });

  // 启动动画更新
  if (modelRef.animalObject) {
    modelRef.viewer.removeAnimate(modelRef.animalObject);
  }
  
  modelRef.animalObject = { 
    fun: () => {
      if (modelRef.mixer) {
        modelRef.mixer.update(fixedDeltaTime);
        
        // 更新相机过渡
        updateCameraTransition();
        
        // 检查是否需要切换相机视角
        if (!isOverheadView && !isTransitioning && carAction) {
          const currentTime = carAction.time;
          const totalDuration = carAction.getClip().duration;
          const halfTime = totalDuration / 2;
          
          // 当动画播放到一半时，开始切换到俯视视角
          if (currentTime >= halfTime && currentTime < halfTime + 0.1) {
            // 切换的时候改成true
            startCameraTransition(false);
          }
        }
        
        // 检查俯视时间是否结束
        if (isOverheadView && !isTransitioning) {
          const currentTime = performance.now();
          if (currentTime - overheadViewStartTime >= overheadViewDuration) {
            startCameraTransition(false);
          }
        }
      }
      return true;
    }, 
    content: modelRef 
  };
  modelRef.viewer.addAnimate(modelRef.animalObject);

  // 监听动画完成
  let finishedCount = 0;
  const totalAnimations = 3;
  
  const handleFinished = (e) => {
    finishedCount++;
    console.log(`动画完成 ${finishedCount}/${totalAnimations}`);
    
    if (finishedCount >= totalAnimations) {
      modelRef.mixer.removeEventListener('finished', handleFinished);
      
      // 清理动画更新
      if (modelRef.animalObject) {
        modelRef.viewer.removeAnimate(modelRef.animalObject);
        modelRef.animalObject = null;
      }
      
      // 清理相机跟随
      if (cameraAnimationHandle) {
        if (modelRef.viewer.removeAnimate) {
          modelRef.viewer.removeAnimate(cameraAnimationHandle);
        } else if (cameraAnimationHandle?.stop) {
          cameraAnimationHandle.stop();
        } else {
          cameraAnimationHandle.enabled = false;
        }
        cameraAnimationHandle = null;
      }
      
      console.log('所有动画完成');
    }
  };
  
  modelRef.mixer.addEventListener('finished', handleFinished);
}
// 创建楼层标签
function _renderLabel(text) {
  return _labelTemplate.replace('{{TEXT}}', String(text));
}

function createTagForObject(target, text = '生产车间') {
  if (!target) return null;
  // 已存在则跳过（或可更新）
  if (_createdTags.has(target.uuid)) return _createdTags.get(target.uuid);

  // 复用 box & vec：避免在循环中 new
  _box.setFromObject(target);
  _box.getCenter(_centerVec);
  _box.getSize(_sizeVec);

  // 更稳健的偏移：fixed 1 或按高度的 5%
  const offset = Math.max(1, _sizeVec.y * 0.05);
  const topY = _box.max.y + offset;

  const pos = { x: _centerVec.x, y: topY, z: _centerVec.z };
  const html = _renderLabel(text);

  // 假设 labelIns.addCss2dLabel(pos, html) 返回一个 handle（若不返回，可存 html + pos）
  const handle = labelIns.addCss2dLabel(pos, html);

  const entry = { object: target, handle, text };
  _createdTags.set(target.uuid, entry);
  return entry;
}
export function createTagsByIndex(count = 20, prefix = '楼') {
  for (let i = 1; i <= count; i++) {
    const name = `${prefix}${i}`;
    const target = modelRef.getObjectByName(name);
    if (!target) {
      console.warn(`createTagsByIndex: 未找到 ${name}`);
      continue;
    }
    // 可自定义文本：这里示例把楼名作为文本
    createTagForObject(target, target.userData?.label || target.name || ` ${i}`);
  }
}
export function ToCar(value) {
   let targetPosition = null
  let targetLookAt = null
  if (value == '园区北半区车位A区') {
    targetPosition = new THREE.Vector3(14.391866831066888, 10.782447143256263, 2.674814314438135);
    targetLookAt = new THREE.Vector3(14.415301025440444,  1.425266169165492e-18, 3.910933000555419);
  } else if (value == '园区北半区车位B区') { 
    targetPosition = new THREE.Vector3(6.511360021906587, 10.800458693299799, 2.7437377223383264);
    targetLookAt = new THREE.Vector3(6.506558549956568,  1.3713741786102338e-17, 3.811338585262976);

  } else if (value == '园区北半区车位C区') {

   } else if (value == '园区北半区车位D区') { 

  }
  viewerRef.flyToCamera(targetPosition, targetLookAt, 60, 3);
}
export function ToBarrier(value) {
   let targetPosition = null
  let targetLookAt = null
  if (value == '园区南门道闸') {
    targetPosition = new THREE.Vector3(1.15957563747159,  8.650179739243933, -9.898129986598107);
    targetLookAt = new THREE.Vector3(1.2220843608544125, -1.9412192803996197e-18, 3 - 4.287809910995905);
    let pos =new THREE.Vector3(2.205519148898532,5.153838307124549,-8.043198010112983);
    Bimg(pos)
    pos = new THREE.Vector3(0.105519148898532,5.153838307124549,-8.043198010112983);
    Bimg(pos)
  } else if (value == '园区北门道闸') { 
    targetPosition = new THREE.Vector3(1.191756400538307, 8.712859666628631, 10.926545271503656);
    targetLookAt = new THREE.Vector3(1.3072903133223575,  -7.828980283005975e-19,  3.276998572230275);

  } else if (value == '园区东门道闸') {

   } 
  viewerRef.flyToCamera(targetPosition, targetLookAt, 60, 3);
}
//  创建警告图标 这里写死
export function ToAdmonish() { 
  let pos =new THREE.Vector3(-0.7296290360427022,5.1260580499408075,9.257541995786273)
 const tex = new THREE.TextureLoader().load('/assets/警告.svg');
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; // 贴图不用重复
  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false, // 始终可见
    sizeAttenuation: true // 随距离缩放
  });
  let value = {
    title: '园区B大门口非法人入侵',
    time: '10月23日 9：00',
    messages: '有陌生人进入园区',
  }
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.name='error_01'
  sprite.key = 'error'
  sprite.value=value
  sprite.scale.set(0.5, 0.5, 0.5);
  sprite.visible = true;
  console.log('定位设备1:', modelRef);
  modelRef.model.scene.add(sprite);
 
}
// 创建火焰图标 这里先写死
export function createBlaze() {
  const pos = new THREE.Vector3(
    -2.603524733284805,
    5.972486897199503 +2,
    6.3999753351073645
  );
  const blazeNumber = 15; // 火焰总数
  const width =3;
  const height = 3;
  const planeGeo = new THREE.PlaneGeometry(width , height );
  let value = {
    title: '仓房出现轻微火灾',
    time: '10月23日 9：00',
    messages: '火灾传感器触发',
  }
  // 贴图
  const blazeTexture = new THREE.TextureLoader().load(
    '/public/assets/火焰.png',
    (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1 / blazeNumber, 1);
    }
  );
  const blazeMat = new THREE.MeshBasicMaterial({
    map: blazeTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,  
    side: THREE.DoubleSide
  });
  const blazeMesh = new THREE.Mesh(planeGeo, blazeMat);
  blazeMesh.position.copy(pos);

  // 始终面向摄像机
  blazeMesh.onBeforeRender = () => blazeMesh.lookAt(viewerRef.camera.position);
  blazeMesh.name = 'error_02';
  blazeMesh.key = 'error';
  blazeMesh.value=value
  modelRef.model.scene.add(blazeMesh);

 
 
  const clock = new THREE.Clock();
  viewerRef.addAnimate({
    content: blazeMesh,
    fun: () => {
      const elapsed = clock.getElapsedTime();
      const currentFrame = Math.floor((elapsed * 10) % blazeNumber);
      // 根据时间切换X轴
      blazeTexture.offset.x = currentFrame / blazeNumber;
     
      return true;
    }
  });
}
function Bimg(pos) { 

 const tex = new THREE.TextureLoader().load('/assets/道闸.svg');
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; // 贴图不用重复
  const mat = new THREE.SpriteMaterial({
    map: tex,
    depthTest: false, // 始终可见
    sizeAttenuation: true // 随距离缩放
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.name='道闸'
  sprite.key='Bimg'
  sprite.scale.set(0.5, 0.5, 0.5);
  sprite.visible = true;
  viewerRef.scene.add(sprite);
}
export function to3D() { 
     const targetPosition = new THREE.Vector3(
      16.260527187720722,
      42.131301686709705,
      92.0577293252906
    );
    const targetLookAt = new THREE.Vector3(
      7.913276217443421,
     -20.07029745381997,
      9.523983223115774
    );
    viewerRef.flyToCamera(targetPosition, targetLookAt, 60, 3);
}
export function disposeRoute() {
  if (scanAnimateObj && viewerRef.removeAnimate) {
    viewerRef.removeAnimate(scanAnimateObj);
    scanAnimateObj = null;
  }
  if (arrowGroup) {
    arrowGroup.parent && arrowGroup.parent.remove(arrowGroup);
    arrowGroup.traverse(o => {
      const m = o.material, g = o.geometry;
      m && m.dispose && m.dispose();
      g && g.dispose && g.dispose();
    });
    arrowGroup = null;
  }
}
export function createLineFromModel(lineObj) {
  // 1) 取动画与轨道
  const clip = modelRef?.model?.animations?.find(o => o.name === '车1Action');
  if (!clip) {
    console.warn('未找到动画: 车1Action');
    return;
  }

  // 轨道名称可能包含层级前缀，保险起见用 includes
  const positionTrack = clip.tracks.find(t => t.name.includes('车1.position'));
  if (!positionTrack) {
    console.warn('未找到 position 轨道: 车1.position');
    return;
  }

  // 2) 读取关键帧坐标（局部坐标）
  const values = positionTrack.values;
  const positionsLocal = [];
  for (let i = 0; i < values.length; i += 3) {
    positionsLocal.push(new THREE.Vector3(values[i], values[i + 1], values[i + 2]));
  }
  if (positionsLocal.length < 2) {
    console.warn('轨道点不足，无法生成曲线');
    return;
  }

  const curve = new THREE.CatmullRomCurve3(positionsLocal, false, 'catmullrom', 0.1);
  curve.arcLengthDivisions = 800;
  disposeRoute();

  const loader = new THREE.TextureLoader();
  loader.load('/assets/路线.png', (tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.x = -1;
    tex.needsUpdate = true;
    arrowGroup = new THREE.Group();
    arrowGroup.frustumCulled = false;
    modelRef.model.scene.add(arrowGroup);
  
    const arrowSize = 0.5;
    const arrowCount = 220;
    const speed = 0.006; // 每秒前进的曲线比例
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,      
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const arrows = [];
    for (let i = 0; i < arrowCount; i++) {
      const u0 = i / arrowCount;
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.scale.set(arrowSize, arrowSize, arrowSize);
      arrowGroup.add(mesh);
      arrows.push({ mesh, u: u0 });
    }

 
    const clock = new THREE.Clock();
    scanAnimateObj = viewerRef.addAnimate({
      content: arrowGroup,
      fun: () => {
        const dt = clock.getDelta();
        for (const a of arrows) {
          a.u = (a.u + speed * dt) % 1;

          // 局部坐标下取点
          const p = curve.getPointAt(a.u);
        
          p.y -= 0.11;

          const t = curve.getTangentAt(a.u).clone().setY(0).normalize();
          a.mesh.position.copy(p);
          a.mesh.rotation.y = Math.atan2(t.x, t.z);
        }
      }
    });
  });
}
let fenceGroup = null;

// 顶点着色器
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 片段着色器 - 从下到上渐变到透明
const fragmentShader = `
  varying vec2 vUv;
  uniform vec3 color1;
  uniform float time;
  uniform float brightnessMultiplier;
  
  void main() {
    // 从下到上透明度渐变 (vUv.y: 0底部 -> 1顶部)
    // 使用幂函数增强渐变对比度
    float alpha = pow(1.0 - vUv.y, 0.5);
    
    // 底部更亮，增强对比
    float brightness = 1.0 + (1.0 - vUv.y) * 0.5;
    
    // 添加动态扫描效果，更明显
    float scan = sin(vUv.y * 8.0 - time * 3.0) * 0.15 + 0.85;
    alpha *= scan;
    
    // 添加垂直条纹效果
    float stripe = sin(vUv.x * 50.0) * 0.05 + 0.95;
    alpha *= stripe;
    
    // 应用亮度乘数
    vec3 finalColor = color1 * brightness * brightnessMultiplier;
    vec4 color = vec4(finalColor, alpha);
    gl_FragColor = color;
  }
`;

// 地面扫描着色器
const groundFragmentShader = `
  varying vec2 vUv;
  uniform vec3 color1;
  uniform float time;
  
  void main() {
    // 网格效果 - 增加网格密度和对比度
    float gridX = abs(fract(vUv.x * 15.0) - 0.5);
    float gridY = abs(fract(vUv.y * 15.0) - 0.5);
    float grid = step(0.45, max(gridX, gridY)) * 0.4;
    
    // 扫描波效果 - 更明显的波动
    float wave = sin(vUv.y * 8.0 - time * 4.0) * 0.3 + 0.5;
    
    // 中心渐变效果
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float radial = 1.0 - smoothstep(0.0, 0.7, dist);
    
    float alpha = 0.25 + grid + wave * 0.2 + radial * 0.15;
    gl_FragColor = vec4(color1, alpha);
  }
`;

/**
 * 创建电子围栏
 * @param {THREE.Vector3} position - 围栏中心位置
 * @param {number} width - 围栏宽度
 * @param {number} depth - 围栏深度
 * @param {object} options - 可选配置
 */
export function createFence(
  position = new THREE.Vector3(0, 0, 0), 
  width = 20, 
  depth = 20,
  options = {}
) {
  const {
    color = 0xff1744,           // 围栏颜色(红色/粉色)
    wallHeight = 4,             // 围栏墙体高度
    animated = true,            // 是否开启动画
    showGround = true,          // 是否显示地面效果
    cornerPillars = true,       // 是否显示角柱
    brightness = 1,       // 显示的亮度
  } = options;

  // 清除旧围栏
  disposeFence();

  fenceGroup = new THREE.Group();
  fenceGroup.name = 'ElectronicFence';
  fenceGroup.position.copy(position);

  // 1. 创建四面墙体（渐变透明效果）
  createGradientWalls(width, depth, wallHeight, color, animated);

  // 2. 创建地面网格效果
  if (showGround) {
    createGroundEffect(width, depth, color, animated);
  }

  // 3. 创建角落柱子
  if (cornerPillars) {
    createCornerPillars(width, depth, wallHeight, color);
  }

  // 4. 创建边框线
  createBorderLines(width, depth, wallHeight, color);
  // 更新亮度 根据传递的值
  updateFenceBrightness (brightness)
  // 添加到场景
  if (viewerRef && viewerRef.scene) {
    viewerRef.scene.add(fenceGroup);
  }

  return fenceGroup;
}

/**
 * 创建渐变墙体
 */
function createGradientWalls(width, depth, height, color, animated) {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'FenceWalls';

  // 创建 Shader 材质
  const createWallMaterial = () => {
    return new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        color1: { value: new THREE.Color(color) },
        time: { value: 0 },
        brightnessMultiplier: { value: 1.0 }  // 默认亮度为1.0
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1.0
    });
  };

  // 四面墙的配置
  const walls = [
    { 
      size: [width, height], 
      pos: [0, height / 2, -depth / 2], 
      rot: [0, 0, 0],
      name: 'wall_front'
    },
    { 
      size: [width, height], 
      pos: [0, height / 2, depth / 2], 
      rot: [0, Math.PI, 0],
      name: 'wall_back'
    },
    { 
      size: [depth, height], 
      pos: [-width / 2, height / 2, 0], 
      rot: [0, Math.PI / 2, 0],
      name: 'wall_left'
    },
    { 
      size: [depth, height], 
      pos: [width / 2, height / 2, 0], 
      rot: [0, -Math.PI / 2, 0],
      name: 'wall_right'
    }
  ];

  walls.forEach(wall => {
    const geo = new THREE.PlaneGeometry(wall.size[0], wall.size[1], 1, 32);
    const mat = createWallMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...wall.pos);
    mesh.rotation.set(...wall.rot);
    mesh.name = wall.name;
    wallGroup.add(mesh);
  });

  fenceGroup.add(wallGroup);

  // 添加动画
  if (animated && viewerRef) {
    const animateObj = {
      content: wallGroup,
      fun: () => {
        const time = performance.now() * 0.001;
        wallGroup.children.forEach(wall => {
          if (wall.material.uniforms) {
            wall.material.uniforms.time.value = time;
          }
        });
        return true;
      }
    };
    viewerRef.addAnimate(animateObj);
    fenceGroup.userData.wallAnimateObj = animateObj;
  }
}

//创建地面网格效果
function createGroundEffect(width, depth, color, animated) {
  const groundGeo = new THREE.PlaneGeometry(width, depth, 20, 20);
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: groundFragmentShader,
    uniforms: {
      color1: { value: new THREE.Color(color) },
      time: { value: 0 }
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  });

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0.05;
  groundMesh.name = 'fence_ground';
  fenceGroup.add(groundMesh);

  // 地面动画
  if (animated && viewerRef) {
    const animateObj = {
      content: groundMesh,
      fun: () => {
        const time = performance.now() * 0.001;
        groundMat.uniforms.time.value = time;
        return true;
      }
    };
    viewerRef.addAnimate(animateObj);
    fenceGroup.userData.groundAnimateObj = animateObj;
  }
}

// 创建角落柱子
function createCornerPillars(width, depth, height, color) {
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2]
  ];

  corners.forEach(([x, z], index) => {
    // 顶部发光球
    const sphereGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(x, height + 0.2, z);
    sphere.name = `sphere_${index}`;
    fenceGroup.add(sphere);

    // 球体脉冲动画
    if (viewerRef) {
      const animateObj = {
        content: sphere,
        fun: () => {
          const time = performance.now() * 0.001;
          const scale = 1 + Math.sin(time * 3 + index) * 0.2;
          sphere.scale.set(scale, scale, scale);
          sphere.material.opacity = 0.7 + Math.sin(time * 3 + index) * 0.3;
          return true;
        }
      };
      viewerRef.addAnimate(animateObj);
      if (!fenceGroup.userData.pillarAnimates) {
        fenceGroup.userData.pillarAnimates = [];
      }
      fenceGroup.userData.pillarAnimates.push(animateObj);
    }
  });
}

// 创建边框线
function createBorderLines(width, depth, height, color) {
  // 底部边框
  const bottomPoints = [
    new THREE.Vector3(-width / 2, 0.1, -depth / 2),
    new THREE.Vector3(width / 2, 0.1, -depth / 2),
    new THREE.Vector3(width / 2, 0.1, depth / 2),
    new THREE.Vector3(-width / 2, 0.1, depth / 2),
    new THREE.Vector3(-width / 2, 0.1, -depth / 2)
  ];

  const bottomGeo = new THREE.BufferGeometry().setFromPoints(bottomPoints);
  const lineMat = new THREE.LineBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.8
  });
  const bottomLine = new THREE.Line(bottomGeo, lineMat);
  bottomLine.name = 'border_bottom';
  fenceGroup.add(bottomLine);

  // 顶部边框
  const topPoints = bottomPoints.map(p => 
    new THREE.Vector3(p.x, height, p.z)
  );
  const topGeo = new THREE.BufferGeometry().setFromPoints(topPoints);
  const topLine = new THREE.Line(topGeo, lineMat.clone());
  topLine.name = 'border_top';
  fenceGroup.add(topLine);

  // 竖直边线（四个角）
  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2]
  ];

  corners.forEach(([x, z], index) => {
    const points = [
      new THREE.Vector3(x, 0.1, z),
      new THREE.Vector3(x, height, z)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMat.clone());
    line.name = `vertical_line_${index}`;
    fenceGroup.add(line);
  });
}

// 清除围栏
export function disposeFence() {
  if (!fenceGroup) return;

  // 移除所有动画
  if (viewerRef && viewerRef.removeAnimate) {
    if (fenceGroup.userData.wallAnimateObj) {
      viewerRef.removeAnimate(fenceGroup.userData.wallAnimateObj);
    }
    if (fenceGroup.userData.groundAnimateObj) {
      viewerRef.removeAnimate(fenceGroup.userData.groundAnimateObj);
    }
    if (fenceGroup.userData.pillarAnimates) {
      fenceGroup.userData.pillarAnimates.forEach(obj => {
        viewerRef.removeAnimate(obj);
      });
    }
  }

  // 清理资源
  fenceGroup.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });

  // 从场景移除
  if (fenceGroup.parent) {
    fenceGroup.parent.remove(fenceGroup);
  }

  fenceGroup = null;
}

// 更新围栏亮度
export function updateFenceBrightness(brightness = 1.0) {
  console.log('fwadfa');
  if (!fenceGroup) return;
  console.log('fwadfa');
  
  fenceGroup.traverse(obj => {
    if (obj.material && obj.material.uniforms) {
      if (obj.material.uniforms.brightnessMultiplier) {
        obj.material.uniforms.brightnessMultiplier.value = brightness;
      }
    }
    // 同时调整发光球和柱子的透明度
    if (obj.name && obj.name.includes('sphere')) {
      if (obj.material && obj.material.opacity !== undefined) {
        // 根据亮度调整基础透明度
        const baseOpacity = obj.name.includes('sphere') ? 0.9 : 0.8;
        obj.material.opacity = baseOpacity * brightness;
      }
    }
  });
}


/*******************  手绘目前不需要       *************************************** */
// 围栏相关变量
let fencePoints = []; // 存储点击的点位
let fenceLine = null; // 当前围栏线条

let isFenceMode = false; // 围栏模式开关

export function fence() {
  console.log('=== fence函数被调用 ===');
  
  // 切换围栏模式
  isFenceMode = !isFenceMode;
  
  if (isFenceMode) {
    console.log('围栏模式已开启，点击模型添加点位（需要4个点）');
    startFenceMode();
  } else {
    console.log('围栏模式已关闭');
    stopFenceMode();
  }
}

// 开始围栏模式
function startFenceMode() {
  console.log('=== 开始围栏模式 ===');
  
  // 检查viewerRef
  if (!viewerRef) {
    console.error('viewerRef 未设置！请先调用 setModel 函数');
    return;
  }
  
  // 清理之前的围栏
  
  if(fencePoints.length>0){ 
     clearFence();
  }
  // 创建围栏组
  fenceGroup = new THREE.Group();
  fenceGroup.name = 'fenceGroup';
  viewerRef.scene.add(fenceGroup);
  
  // 设置点击回调
  viewerRef.setClickCallback(handleFenceClick);
  
  console.log('围栏模式已启动，请点击模型添加点位');
}

// 点击时间停止
function stopFenceMode() {
  console.log('=== 停止围栏模式 ===');
  
  // 清除点击回调
  if (viewerRef && viewerRef.setClickCallback) {
    viewerRef.setClickCallback(null);
  }
}

// 处理围栏点击
function handleFenceClick({ world, object }) {
  console.log('=== 处理点击 ===');
  console.log('点击的世界坐标:', world);
  console.log('点击的对象:', object.name);
  
  if (!isFenceMode) {
    console.log('点击围栏已经开启忽略点击');
    return;
  }
  
  // 添加点位
  addFencePoint(world);
}

// 添加围栏点位
function addFencePoint(point) {

  // 如果已经有4个点，重新开始
  if (fencePoints.length >= 4) {
    console.log('已有4个点，重新开始');
    clearFence();
    startFenceMode();
  }
  
  fencePoints.push(point.clone());
  console.log(`添加第 ${fencePoints.length} 个点位`);
  
  // 创建点位标记
  createPointMarker(point, fencePoints.length);
  
  // 更新线条
  updateFenceLine();
  
  // 检查是否达到4个点
  if (fencePoints.length === 4) {
    console.log('已收集4个点，自动完成围栏');
    completeFence();
  } else {
    console.log(`还需要 ${4 - fencePoints.length} 个点`);
  }
}

// 创建点位标记
function createPointMarker(point, index) {
  console.log('=== 创建点位标记 ===');
  
  // 创建红色球体标记
  const geometry = new THREE.SphereGeometry(0.2, 16, 12);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xff0000,
    transparent: true,
    opacity: 0.9
  });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(point);
  marker.name = `fencePoint_${index}`;
  
  fenceGroup.add(marker);
  console.log(`点位标记 ${index} 已创建`);
  
  // 创建数字标签
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 64;
  canvas.height = 64;
  
  context.fillStyle = 'white';
  context.fillRect(0, 0, 64, 64);
  
  context.fillStyle = 'red';
  context.font = '32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(index.toString(), 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.copy(point);
  sprite.position.y += 0.5;
  sprite.scale.set(0.5, 0.5, 1);
  sprite.name = `fenceText_${index}`;
  
  fenceGroup.add(sprite);
  console.log(`数字标签 ${index} 已创建`);
}

// 围栏线条
function updateFenceLine() {
  console.log('当前点位数量:', fencePoints.length);
  
  // 移除之前的线条
  if (fenceLine) {
    fenceGroup.remove(fenceLine);
    fenceLine.geometry.dispose();
    fenceLine.material.dispose();
  }
  
  // 至少需要2个点才能画线
  if (fencePoints.length < 2) {
    console.log('点位不足，无法创建线条');
    return;
  }
  
  // 创建线条几何体
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  
  // 添加所有点位
  fencePoints.forEach((point, index) => {
    console.log(`添加点位 ${index + 1} 到线条:`, point);
    positions.push(point.x, point.y, point.z);
  });
  
  // 如果有4个点，闭合线条
  if (fencePoints.length === 4) {
    const firstPoint = fencePoints[0];
    console.log('闭合线条，添加第一个点位:', firstPoint);
    positions.push(firstPoint.x, firstPoint.y, firstPoint.z);
  }
  
  console.log('线条位置数组长度:', positions.length);
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  // 创建红色线条材质
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 20,
    transparent: true,
    opacity: 1.0
  });
  
  // 创建线条
  fenceLine = new THREE.Line(geometry, material);
  fenceLine.name = 'fenceLine';
  
  fenceGroup.add(fenceLine);
  console.log('围栏线条已创建并添加到场景');
  
 
}

// 完成围栏
function completeFence() {
  console.log('');
  console.log('=== 完成围栏这是我的围栏数组 ===', fencePoints, );
  
  // 关闭围栏模式
  isFenceMode = false;
  stopFenceMode();
  
  console.log('围栏模式已关闭，围栏创建完成！');
}

// 清理围栏
export function clearFence() {
  console.log('=== 清理围栏 ===');
  
  // 停止围栏模式
  if (isFenceMode) {
    stopFenceMode();
  }
  
  // 移除围栏组
  if (fenceGroup && viewerRef && viewerRef.scene) {
    viewerRef.scene.remove(fenceGroup);
    
    // 清理几何体和材质
    fenceGroup.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    fenceGroup = null;
  }
  
  // 重置数据
  fencePoints = [];
  fenceLine = null;
  isFenceMode = false;
  
  console.log('围栏已清理');
}

// 调试函数
export function debugFence() {
  console.log('=== 围栏调试信息 ===');
  console.log('isFenceMode:', isFenceMode);
  console.log('fencePoints数量:', fencePoints.length);
  console.log('fencePoints:', fencePoints);
  console.log('fenceLine:', fenceLine);
  console.log('fenceGroup:', fenceGroup);
  console.log('viewerRef:', viewerRef);
  if (viewerRef && viewerRef.scene) {
    console.log('场景子对象数量:', viewerRef.scene.children.length);
  }
}
export function escapeFu(man) {
  // 不使用 startAnimal,直接用 Three.js 的 AnimationMixer
  if (!man.mixer) {
    man.mixer = new THREE.AnimationMixer(man.object);
  }
  
  // 同时播放两个动画
  const clip1 = man.model.animations[0];
  const clip2 = man.model.animations[1];
  
  const action1 = man.mixer.clipAction(clip1);
  const action2 = man.mixer.clipAction(clip2);
  
  // 可以设置不同的权重(如果需要混合)
  action1.setEffectiveWeight(1.0);
  action2.setEffectiveWeight(1.0);
  
  action1.play();
  action2.play();
  
  console.log('播放动画1:', clip1.name);
  console.log('播放动画2:', clip2.name);
  function updateAnimation(deltaTime) {
    if (man.mixer) {
      man.mixer.update(deltaTime);
    }
  }

  return updateAnimation; // 返回更新函数
}
 

  
 