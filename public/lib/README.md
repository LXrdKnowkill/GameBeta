# 🔧 Correção do Erro de Física Havok

## 📋 **Problema:**
O arquivo WASM do Havok não está sendo servido corretamente pelo Vite durante desenvolvimento.

## ✅ **Solução Manual:**

1. **Copie o arquivo WASM do Havok:**
   ```bash
   # No Windows (PowerShell):
   Copy-Item "node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm" "public/lib/"
   
   # No Linux/Mac:
   cp node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm public/lib/
   ```

2. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 🔄 **Fallback Automático:**
Se a física falhar, o jogo continuará funcionando sem física real, usando movimento manual.

## 🏗️ **Para Produção:**
O build de produção (`npm run build`) já inclui o arquivo WASM automaticamente.

## 📝 **Notas:**
- Esta pasta (`public/lib/`) é para servir arquivos estáticos durante desenvolvimento
- O Vite já foi configurado para servir arquivos WASM com o MIME type correto
- A física é opcional - o jogo funciona sem ela 