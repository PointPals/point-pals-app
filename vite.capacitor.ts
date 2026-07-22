/**
 * Vite config for the Capacitor SPA build.
 *
 * This builds a pure client-side bundle (no TanStack Start, no Nitro SSR).
 * - Entry: capacitor.html → src/main-capacitor.tsx (named capacitor.html, NOT
 *   index.html, so the web/TanStack-Start build never picks it up as the site
 *   entry — a root index.html would be served as a blank shell on the web).
 *   The build output is renamed back to index.html by the `build:cap` script.
 * - Output: capacitor-web/ (manually synced via `npx cap copy`)
 * - Aliases @/lib/emails.functions → capacitor compat shim
 * - Base is './' so assets load from file:// in Capacitor WebView
 */

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const envDefine: Record<string, string> = {}
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  return {
    base: './',

    define: {
      ...envDefine,
      __PP_BUILD_ID__: JSON.stringify(String(Date.now())),
    },

    build: {
      outDir: 'capacitor-web',
      emptyOutDir: true,
      cssMinify: 'lightningcss',
      target: 'es2022',
      rollupOptions: {
        // Explicit entry: the file is named capacitor.html (not index.html) so
        // the web build ignores it. build:cap renames the output to index.html.
        input: 'capacitor.html',
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },

    css: {
      transformer: 'lightningcss',
    },

    resolve: {
      alias: [
        // ⚠️  Specific aliases MUST come before the generic @/ catch-all
        // Replace TanStack Start server functions with capacitor shims
        {
          find: /^@\/lib\/emails\.functions$/,
          replacement: `${process.cwd()}/src/lib/emails.functions.capacitor.ts`,
        },
        // Catch-all for @/ paths
        { find: /^@\//, replacement: `${process.cwd()}/src/` },
        // TanStack Start SSR packages — noop in the SPA build
        {
          find: /^@tanstack\/react-start(\/.*)?$/,
          replacement: `${process.cwd()}/src/capacitor-noop.ts`,
        },
        {
          find: /^@tanstack\/start-/,
          replacement: `${process.cwd()}/src/capacitor-noop.ts`,
        },
        {
          find: /^@sentry\/tanstackstart-react(\/.*)?$/,
          replacement: `${process.cwd()}/src/capacitor-noop.ts`,
        },
      ],
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tanstack/react-query',
        '@tanstack/query-core',
      ],
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },

    plugins: [tailwindcss(), tsConfigPaths({ projects: ['./tsconfig.json'] }), viteReact()],
  }
})
