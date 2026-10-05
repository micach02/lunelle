/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Public base path. "/" for Vercel/Netlify/custom domains; set BASE_PATH to
 * "/<repo>/" for a GitHub Pages project site (the Pages workflow does this).
 */
const base = process.env.BASE_PATH ?? '/';

/**
 * Production-only Content-Security-Policy <meta>, for hosts that cannot send
 * custom headers (GitHub Pages). Vercel/Netlify also send it as a header.
 * Not applied in dev, where Vite injects inline scripts for hot reloading.
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'lunelle-csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // A fixed port keeps Supabase redirect URLs and the invite function's
  // allowed origins valid. Fail instead of silently moving to another port.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    sourcemap: false,
    // Main chunk is ~235 kB gzipped: react-dom, supabase-js, react-router and zod
    // dominate (measured via source map). Recharts is split into the lazy Insights chunk.
    chunkSizeWarningLimit: 850,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
