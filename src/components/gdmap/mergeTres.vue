
<template></template>
<script setup>
import { watchEffect } from 'vue'
import ThreeViewer from '@/common/threeJs/Viewer';
import { useMapStore } from '@/stores/mapStore'

const props = defineProps({
	center: {
		default: [0, 0]
	},
	viewer:{
		default:{}
	}
})


const mapStore = useMapStore()
let customCoords = null
let customLayer = null
watchEffect(() => {
	if (mapStore.aMap && props.viewer.renderer ) {
		const { camera, scene, renderer } =props.viewer
		console.log('1111111111',camera, scene, renderer);
		
		// renderer.value.autoClear = false
		customCoords = mapStore.mapHandle.customCoords
		customLayer = new mapStore.aMap.CustomLayer(renderer.domElement, {
			zIndex: 10,
			render: () => {
				renderer.resetState()
				customCoords.setCenter(props.center)
				const { near, far, fov, up, lookAt, position } =
					customCoords.getCameraParams()
			
				// 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
				camera.near = near
				camera.far = far
				camera.fov = fov
				mapStore.$patch({
					cameraState: {
						near, far, fov, position
					}
				})
				camera.position.set(...position)
				camera.up.set(...up)
				camera.lookAt(...lookAt)
				camera.updateProjectionMatrix()
				renderer.render(scene, camera)
				renderer.resetState()
			},
			alwaysRender: true
		})
		console.log('customLayer',customLayer);
		
		mapStore.mapHandle.add(customLayer)
	}
})
</script>