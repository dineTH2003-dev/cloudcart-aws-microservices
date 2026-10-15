import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api/products': 'http://localhost:8001',
      '/api/users': 'http://localhost:8002',
      '/api/orders': 'http://localhost:8003',
      '/api/inventory': 'http://localhost:8004',
      '/api/notifications': 'http://localhost:8005',
      '/api/payments': 'http://localhost:8006',
    }
  }
})
