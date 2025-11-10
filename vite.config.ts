import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { mars3dPlugin } from "vite-plugin-mars3d"
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    mars3dPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#': path.resolve(__dirname, './public'),
    },
  },
  server: {
    host: '0.0.0.0'
  }
});
