import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/client/index.ts',
      formats: ['iife'],
      name: 'TohelperWidget',
      fileName: () => 'widget.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
  },
})
