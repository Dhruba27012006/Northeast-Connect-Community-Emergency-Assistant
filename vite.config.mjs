import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { demoApi } from './server/demo.mjs'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), ...(env.VITE_SUPABASE_URL ? [] : [demoApi(env)])],
    server: {
      host:'127.0.0.1',
      fs: {deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.local/**','**/*.sqlite*','**/server/**']}
    },
    preview: {host:'127.0.0.1'}
  }
})
