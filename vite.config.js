import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'assets/dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'assets/js/main.js'
    }
  },
  server: {
    port: 3000
  }
});
