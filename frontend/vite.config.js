import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Split out of the entry chunk so a code change to the app does not invalidate
// the browser cache for dependencies that rarely move. React and the router
// share a chunk on purpose: the router reads React context, and separating them
// only buys a second request for modules that always load together.
const REACT_VENDOR = ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler']

// react-markdown pulls the whole unified/remark/micromark tree behind it.
const MARKDOWN_VENDOR = [
  'react-markdown/',
  'remark-',
  'rehype-',
  'micromark',
  'mdast-',
  'hast-',
  'unist-',
  'unified/',
  'vfile',
  'bail/',
  'trough/',
  'devlop/',
  'decode-named-character-reference/',
  'character-entities',
  'property-information/',
  'space-separated-tokens/',
  'comma-separated-tokens/',
  'html-url-attributes/',
  'estree-util-is-identifier-name/',
  'zwitch/',
  'longest-streak/',
  'ccount/',
  'escape-string-regexp/',
  'markdown-table/',
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Fail the build, not the browser. The guard in src/services/api.js runs at
  // module load: Vite only bundles that module, it never evaluates it, so a
  // missing VITE_API_URL would ship a bundle that throws on first page load
  // instead of showing up in the Vercel build log. This check runs during the
  // build itself. loadEnv also reads process.env, which is how Vercel and
  // Render pass the variable.
  const env = loadEnv(mode, process.cwd(), '')
  if (!env.VITE_API_URL) {
    throw new Error(
      'VITE_API_URL is not defined. Set it in frontend/.env.local for local dev, ' +
        'or in the Vercel project settings (Production and Preview) for deploys.',
    )
  }

  return {
    plugins: [react()],
    build: {
      // html2pdf.js is already behind a dynamic import in OutreachPackPanel, so
      // its ~1 MB chunk is only fetched when a user exports a PDF and never on
      // first paint. 1200 kB keeps the warning meaningful for the eagerly
      // loaded chunks without firing on that deliberate one.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (REACT_VENDOR.some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
              return 'react-vendor'
            }
            if (MARKDOWN_VENDOR.some((prefix) => id.includes(`/node_modules/${prefix}`))) {
              return 'markdown-vendor'
            }
            if (id.includes('/node_modules/@dnd-kit/')) return 'dnd-vendor'
          },
        },
      },
    },
  }
})
