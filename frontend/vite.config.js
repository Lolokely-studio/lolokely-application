import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
  }
})
