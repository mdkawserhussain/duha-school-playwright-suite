import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyPort = process.env.VITE_PROXY_PORT || '3001';

export default defineConfig({
  plugins: [react()],
  root: 'web',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': `http://localhost:${proxyPort}`,
      '/output': `http://localhost:${proxyPort}`,
    },
  },
});
