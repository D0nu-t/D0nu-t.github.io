import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:              resolve(__dirname, 'index.html'),
        interpretability:  resolve(__dirname, 'projects/interpretability-platform.html'),
        tinynla:           resolve(__dirname, 'projects/tinynla.html'),
        policySimulator:   resolve(__dirname, 'projects/policy-simulator.html'),
        graph:             resolve(__dirname, 'graph.html'),
      },
    },
  },
})
