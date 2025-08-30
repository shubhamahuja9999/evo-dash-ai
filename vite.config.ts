import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['playwright', 'playwright-core'],
  },
  build: {
    rollupOptions: {
      external: [
        'playwright',
        'playwright-core',
        'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
        'chromium-bidi/lib/cjs/cdp/CdpConnection'
      ]
    }
  }
}));