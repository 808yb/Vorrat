import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Lokale Vite-Dev-Middleware für /api/scrape und /api/gemini.
 * Führt beide Serverless Functions direkt im lokalen Vite-Prozess auf Port 3000 aus,
 * wodurch kein externer Vercel-Server auf Port 3001 nötig ist und 502 Bad Gateway Fehler
 * vollständig verhindert werden.
 */
function localScrapeDevPlugin(env: Record<string, string>): Plugin {
  return localApiDevPlugin(env);
}

// Prozess-Schutz gegen unhandled rejections und socket aborts im Vite Dev-Server
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err: any) => {
    console.warn('[Vite Dev Server Guard] Uncaught Exception abgefangen:', err?.message || err);
  });
  process.on('unhandledRejection', (reason: any) => {
    console.warn('[Vite Dev Server Guard] Unhandled Rejection abgefangen:', reason?.message || reason);
  });
}

function localApiDevPlugin(env: Record<string, string>): Plugin {
  const setupAdaptedReqRes = async (req: any, res: any) => {
    // Socket-Fehler auf Client-Seite abfangen
    if (typeof req.on === 'function') {
      req.on('error', (err: any) => {
        console.warn('[Vite Dev Req Error]:', err?.message || err);
      });
    }
    if (typeof res.on === 'function') {
      res.on('error', (err: any) => {
        console.warn('[Vite Dev Res Error]:', err?.message || err);
      });
    }

    const host = req.headers.host || 'localhost:3000';
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
    const fullReqUrl = new URL(req.url || '/', `${protocol}://${host}`);

    const query: Record<string, string> = {};
    fullReqUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    let body: any = {};
    if (req.method === 'POST') {
      body = await new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk: Buffer) => {
          raw += chunk.toString();
        });
        req.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
        req.on('error', () => {
          resolve({});
        });
      });
    }

    const adaptedRes: any = res;
    adaptedRes.status = (code: number) => {
      try {
        res.statusCode = code;
      } catch {}
      return adaptedRes;
    };
    adaptedRes.json = (data: any) => {
      try {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(data));
      } catch (endErr: any) {
        console.warn('[Vite Dev Res.json Error]:', endErr?.message || endErr);
      }
      return adaptedRes;
    };

    const adaptedReq: any = req;
    adaptedReq.query = query;
    adaptedReq.body = body;

    return { adaptedReq, adaptedRes };
  };

  return {
    name: 'local-api-dev',
    configureServer(server) {
      // 1. /api/scrape
      server.middlewares.use('/api/scrape', async (req, res) => {
        try {
          const { adaptedReq, adaptedRes } = await setupAdaptedReqRes(req, res);
          const scrapeModule = await import('./api/scrape.ts');
          const handler = scrapeModule.default || scrapeModule;
          await Promise.resolve(handler(adaptedReq, adaptedRes)).catch((handlerErr: any) => {
            console.warn('[Vite Scrape Handler Rejected]:', handlerErr?.message || handlerErr);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Scrape Handler Fehler: ${handlerErr?.message || handlerErr}` }));
            }
          });
        } catch (error: any) {
          console.warn('[Vite Scrape Middleware Error]:', error?.message || error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Lokale Scrape-Middleware Fehler: ${error?.message || error}` }));
          }
        }
      });

      // 2. /api/gemini (Verhindert 502 Bad Gateway durch lokalen Port 3001)
      server.middlewares.use('/api/gemini', async (req, res) => {
        try {
          process.env.GEMINI_API_KEY =
            process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
          process.env.VITE_GEMINI_API_KEY =
            process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

          const { adaptedReq, adaptedRes } = await setupAdaptedReqRes(req, res);
          const geminiModule = await import('./api/gemini.ts');
          const handler = geminiModule.default || geminiModule;
          await Promise.resolve(handler(adaptedReq, adaptedRes)).catch((handlerErr: any) => {
            console.warn('[Vite Gemini Handler Rejected]:', handlerErr?.message || handlerErr);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Gemini Handler Fehler: ${handlerErr?.message || handlerErr}` }));
            }
          });
        } catch (error: any) {
          console.warn('[Vite Gemini Middleware Error]:', error?.message || error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Lokale Gemini-Middleware Fehler: ${error?.message || error}` }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), localApiDevPlugin(env)],
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
      },
    },
  };
});
