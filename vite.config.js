import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'unknown'; }
})();

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(gitSha),
  },
  build: {
    outDir: 'assets/dist',
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      input: 'assets/js/app.js',
      output: {
        entryFileNames: 'app.[hash].min.js',
        format: 'es',
      },
    },
  },
});
