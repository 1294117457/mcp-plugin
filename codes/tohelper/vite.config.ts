import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/client/entry.tsx',
      formats: ['cjs'],
      fileName: () => 'client.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
      output: {
        banner: `window.__ModuleLoader__.load({ id: "tohelper", factory: (require) => {`,
        footer: 'return module.exports; } });',
        intro: 'var module = { exports: {} }; var exports = module.exports;',
      },
    },
  },
})
