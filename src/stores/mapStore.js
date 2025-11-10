
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export const useMapStore = defineStore('mapStore', () => {
	const aMap = shallowRef(null)
	const mapHandle = shallowRef(null)
	const cameraState = shallowRef(null)

	//导出参数
	return { aMap, mapHandle, cameraState }
})