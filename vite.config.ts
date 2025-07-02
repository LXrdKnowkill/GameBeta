import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    open: true,
    // Headers para isolamento de origem (necessários para SharedArrayBuffer)
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // Configurar para incluir arquivos WASM nos assets
  assetsInclude: ['**/*.wasm'],
  
  // Otimizar dependências do Babylon.js
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/havok']
  }
});