import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    build: process.env.CNC_LEGACY_ASSETS === 'true'
      ? { cssCodeSplit: false, rolldownOptions: { output: { codeSplitting: false } } }
      : undefined,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html', 'src/main.tsx'],
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_ORIGIN || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/merged-cash-n-carry/**', '**/deploy/**', '**/public/assets/**', '**/server/**'],
            },
    },
  };
});
