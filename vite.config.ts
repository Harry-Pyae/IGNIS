/// <reference types="vitest/config" />
import type { IncomingMessage } from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Local dev only: serve /api/<name> from api/<name>.ts with the same
 * Web-standard `export function POST(request)` signature Vercel uses,
 * so `npm run dev` runs the full app without the Vercel CLI.
 */
function devApi(): Plugin {
  return {
    name: 'ignis-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const name = url.pathname.match(/^\/api\/([\w-]+)$/)?.[1];
        if (!name) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1');
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const response = await handler(
            new Request(url.href, { method: req.method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined }),
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Server handlers read process.env in dev, exactly as on Vercel.
  for (const [k, v] of Object.entries(env)) process.env[k] ??= v;

  return {
    plugins: [react(), tailwindcss(), devApi()],
    // Only the two PUBLIC Supabase values reach the browser bundle.
    // Never add the service-role key or LLM keys here.
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY ?? ''),
    },
    test: {
      env,
      include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    },
  };
});
