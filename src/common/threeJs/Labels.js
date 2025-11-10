// Labels.ts
import { InteractiveGroup } from "three/examples/jsm/interactive/InteractiveGroup"
import { CSS2DObject ,CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer"
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer"

export default class Labels {
  constructor(viewer) {
    this.viewer = viewer
     // 初始化CSS3D渲染器
    this.css3DRenderer = new CSS3DRenderer();
    this.css3DRenderer.setSize(viewer.container.clientWidth, viewer.container.clientHeight);
    this.css3DRenderer.domElement.style.position = 'absolute';
    this.css3DRenderer.domElement.style.top = '0';
    this.css3DRenderer.domElement.style.pointerEvents = 'none';

    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(viewer.container.clientWidth, viewer.container.clientHeight);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    viewer.container.appendChild(this.css3DRenderer.domElement);
    viewer.container.appendChild(this.css2DRenderer.domElement);
    this.group = new InteractiveGroup(this.viewer.renderer, this.viewer.camera)
    this.viewer.scene.add(this.group)
  }

  /**
   * 添加 CSS2D 标签
   * @param {*} position { x, y, z }
   * @param {*} html HTML 内容
   */
      addCss2dLabel(position = {x:0,y:0,z:0}, content = '') {
        let div
        if (typeof content === 'string') {           
          div = document.createElement('div')
          div.innerHTML = content
        } else {                                   
          div = content
          div.style.position = 'absolute'
        }
        div.style.pointerEvents = 'auto'
        const label = new CSS2DObject(div)          
        label.position.set(position.x, position.y, position.z)
        this.viewer.scene.add(label)
        return label
      }

  /**
   * 添加 CSS3D 标签（支持面板、图像等）
   * @param {*} position { x, y, z }
   * @param {*} html HTML 内容
   * @param {*} options { useSprite: true | false, scale: number }
   */
 addCss3dLabel(position = { x: 0, y: 0, z: 0 }, html = "", options = {}) {
    const { scale = 0.01 } = options

  
    const div = document.createElement("div")
   div.innerHTML = html
   div.style.pointerEvents = 'auto'  // 允许点击
   div.style.cursor = "pointer"


   const label = new CSS3DObject(div)
   
    label.scale.set(scale, scale, scale)
    label.position.set(position.x, position.y, position.z)

 
    this.group.add(label)

    return label
  }
}
  

