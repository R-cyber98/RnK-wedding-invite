import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './api/whatsapp.js'

export default defineConfig(({ mode }) => {
  // dev only: serve /api/whatsapp like Vercel does. Number comes from .env.local (not prefixed VITE_, so never bundled).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      {
        name: 'dev-api-whatsapp',
        configureServer(server) {
          server.middlewares.use('/api/whatsapp', (req, res) => {
            process.env.WHATSAPP_NUMBER ??= env.WHATSAPP_NUMBER
            handler(req, res)
          })
        },
      },
    ],
  }
})
