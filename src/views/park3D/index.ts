import * as THREE from "three";

/**
 * 假数据配置文件
 * 所有假数据都集中在这里管理
 */

// 初始人员数据
export const initialPersonData = {
  name: "",
  name1: "王振",
  status: "走动",
  time: "2025-11-04 09:18",
  location: "东区一层走道",
  stopTime: "",
};

// 人员类型关键词
export const typeKeywords = {
  施工人员: "施工人员",
  特种人员: "特种人员",
  安全人员: "安全人员",
  管理人员: "管理人员",
};

export const typeKeywordsArray = [
  "施工人员",
  "安全人员",
  "特种人员",
  "管理人员",
];

// 人员名字和位置映射
export const personLocationMap: Record<string, string> = {
  张森: "三层",
  翁建力: "一层",
  张浩: "二层",
  钱进: "施工区域A半区",
  王立新: "施工区域A半区",
  王林: "施工区域A半区",
};

// 默认位置 (当人员不在上述映射中时使用)
export const defaultLocation = "施工区域B半区";

// 楼层位置数据 (Vector3坐标)
export const floorPositions = {
  oneF: new THREE.Vector3(18.6375489431871, 0, 17.5843654619666),
  towF: new THREE.Vector3(
    18.904396057128906,
    5.131638526916504,
    18.331676483154297
  ),
  threeF: new THREE.Vector3(
    19.012385401629846,
    9.978727058887017,
    18.615460820410764
  ),
};

// 区域位置数据 (Vector3坐标)
export const areaPositions = {
  A: new THREE.Vector3(-29.183954389859725, 0, 49.09463862433194),
  B: new THREE.Vector3(0.1977686978768415, 0, 34.04037422441209),
  C: new THREE.Vector3(16.554642716625747, 0, 23.148398624298675),
  D: new THREE.Vector3(
    40.69821902862813,
    0.11511509865522385,
    11.570785552081212
  ),
};

// 路径映射配置
export const pathMapping = [
  { path: "行走1", location: "施工A区" },
  { path: "行走2", location: "施工A区" },
  { path: "行走3", location: "施工B半区" },
  { path: "行走4", location: "施工B半区" },
  { path: "行走5", location: "施工A生产区" },
  { path: "行走6", location: "施工A领料区" },
  { path: "行走7", location: "施工A领料区" },
  { path: "行走8", location: "领料区" },
  { path: "行走9", location: "管理科" },
  { path: "行走10", location: "管理科" },
];

// 所有人员名称映射
export const allWorkNames = [
  { model: "交互人员1", name: "王证" },
  { model: "交互人员2", name: "李芳" },
  { model: "交互人员3", name: "张浩" },
  { model: "交互人员4", name: "陈思" },
  { model: "交互人员5", name: "刘晓" },
  { model: "交互人员6", name: "黄强" },
  { model: "交互人员7", name: "吴梦" },
  { model: "交互人员8", name: "周敏" },
  { model: "交互人员9", name: "徐波" },
  { model: "交互人员10", name: "赵彤" },
];

// 相机位置配置
export const cameraPositions = {
  // iframeEscapeFu 初始相机位置
  escapeFuInitial: {
    targetPosition: new THREE.Vector3(
      -35.53187888911927,
      7.612160668470617,
      99.01736199101822
    ),
    targetLookAt: new THREE.Vector3(
      -28.53679207143279,
      -8.058659255764104,
      23.930362706665477
    ),
  },
  // allScapeFu 初始相机位置
  allScapeFuInitial: {
    targetPosition: new THREE.Vector3(
      -35.53187888911927,
      7.612160668470617,
      99.01736199101822
    ),
    targetLookAt: new THREE.Vector3(
      -28.53679207143279,
      -8.058659255764104,
      23.930362706665477
    ),
  },
  // iframeEscapeFu1 初始相机位置
  escapeFu1Initial: {
    targetPosition: new THREE.Vector3(
      23.46534759453364,
      10.165271159010924,
      39.58041287537948
    ),
    targetLookAt: new THREE.Vector3(
      10.227580805966154,
      -9.032776409447077,
      0.35416471906174474
    ),
  },
  // B半区相机位置
  bAreaCamera: {
    targetPosition: new THREE.Vector3(
      12.439331951916236,
      9.912034386435046,
      76.8001385849277
    ),
    targetLookAt: new THREE.Vector3(
      10.735384398233215,
      -4.110115251965986,
      21.971348037910868
    ),
  },
  // 告警点相机位置
  alarmPointCamera: {
    camPos: new THREE.Vector3(
      25.51616912589681,
      10.747001275887982,
      28.219898262467254
    ),
    targetLookAt: new THREE.Vector3(5.913136, -2.364725, -0.509497),
  },
};

// 时间数据
export const timeData = {
  initialTime: "2025-11-04 09:18",
  aAreaTime: "2025-11-04 10:18",
  bAreaTime: "2025-11-04 12:18",
  cAreaTime: "2025-11-04 13:18",
  dAreaTime: "2025-11-04 14:18",
};

// 地点更新数组 (用于 allScapeFu 函数)
export const locationUpdateArrays = {
  update1: [
    "A半区道",
    "A半区道",
    "施工A区",
    "施工A区",
    "生产1区",
    "生产2区",
    "管理科",
    "走道",
    "吊塔区",
    "吊塔区",
  ],
  update2: [
    "B半区道",
    "B半区道",
    "施工B区",
    "施工B区",
    "生产3区",
    "生产4区",
    "技术科",
    "楼梯间",
    "配电房",
    "配电房",
  ],
  update3: [
    "B区走道",
    "B区走道",
    "仓库A区",
    "仓库A区",
    "堆料场",
    "混凝土站",
    "钢筋加工区",
    "钢筋加工区",
    "木料堆放",
    "木料堆放",
  ],
  update4: [
    "一层施工",
    "一层施工",
    "一层施工",
    "一层施工",
    "一层施工",
    "一层施工",
    "塔吊区",
    "塔吊区",
    "脚手架区",
    "脚手架区",
  ],
};

// 停顿点配置
export const pausePointsConfig = {
  stop2: {
    duration: 5, // 停顿5秒
    label: "停顿点2",
    animation: 0,
    status: "静止",
    stopTime: "",
  },
  stop3: {
    duration: 2, // 停顿2秒
    label: "停顿点3",
    animation: 0,
    stopTime: "停留2秒",
    location: "停顿点3",
  },
};

// 电子围栏配置
export const fenceConfig = {
  position: new THREE.Vector3(
    19.63532184041039,
    5.132415771484375,
    12.067837620433064
  ),
  width: 5,
  depth: 5,
  options: {
    color: 0x40d9d5, // 青色
    wallHeight: 3, // 墙高度
    animated: false, // 开启动画
    showGround: false, // 显示地面
    brightness: 1, // 亮度
  },
};

// 路径轨迹配置
export const pathTrailConfig = {
  escapeFu: {
    color: 0xff0000, // 红色
    fadeEffect: false, // 渐变效果
    dashed: true, // 虚线
  },
  escapeFu1: {
    color: 0xff0000, // 红色
    fadeEffect: false, // 渐变效果
    dashed: false, // 实线
  },
  allScapeFu: {
    color: 0xff0000, // 红色
    fadeEffect: false, // 渐变效果
    dashed: true, // 虚线
  },
};

// 特殊人员标识 (用于条件判断)
export const specialPersonNames = {
  wangZhen: "王振",
};

// 需要隐藏的基础元素
export const baseElementsToHide = ["交互人员", "闯入路径", "上下楼路径"];

// 区域标签映射
export const areaLabels = {
  aArea: "A半区",
  bArea: "B半区",
  cArea: "C半区",
  dArea: "厂房A半区",
};

// 默认文本常量
export const defaultTexts = {
  unknownPerson: "未知人员",
  defaultWorkType: "安全人员",
  unknownWorkType: "未知类型",
  statusWalking: "走动",
  statusStill: "静止",
  pause3F: "在3F停留2分钟",
  completeWalking: "完成行走",
  alarmArea: "告警区域",
};

