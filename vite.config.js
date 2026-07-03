import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'pocketbase-import-keyword-fix',
        transform(code, id) {
          // Run this transformation on any PocketBase SDK source file
          if (id.includes('pocketbase')) {
            return {
              code: code.replace(/async\s+import\(/g, 'async "import"('),
              map: null
            };
          }
          return null;
        }
      }
    ],
    optimizeDeps: {
      // Exclude pocketbase from Vite's pre-bundling so our plugin runs on it during dev
      exclude: ['pocketbase']
    }
  };
})

