import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        interpretability: resolve(__dirname, 'projects/interpretability-platform.html'),
        graph: resolve(__dirname, 'projects/graph.html'),
      },
    },
  },
})
