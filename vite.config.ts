import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', '@zxing/library'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Open Food Facts API passthrough (unchanged)
        '/api/off': {
          target: 'https://world.openfoodfacts.org',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/off/, ''),
          headers: {
            'User-Agent': 'VorratsManagerApp/1.0 (contact@example.com)',
          },
        },
        // Gemini serverless function: proxy to local `vercel dev` on port 3001.
        // Run `vercel dev` in a separate terminal to enable this.
        // If not running, geminiProxy.ts falls back to VITE_GEMINI_API_KEY directly.
        '/api/gemini': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
