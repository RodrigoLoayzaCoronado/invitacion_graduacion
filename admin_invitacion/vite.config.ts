import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  devtools: {
    // Remove this `apply` property to enable devtools for build as well
    apply: 'serve',
  },
  plugins: [vue()],
  // La landing usa 5173; el panel queda fijo en 5174 para poder correr ambos a la vez
  server: { port: 5174 },
})
