// main.ts 或 main.js

import "mars3d-cesium/Build/Cesium/Widgets/widgets.css"
import "mars3d/mars3d.css"

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import "./style.css"
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
const app = createApp(App)


const pinia = createPinia()
app.use(pinia)
app.use(ElementPlus)

app.mount('#app')
