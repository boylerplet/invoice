import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const server = "http://127.0.0.1:3001"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: { "/api": server, "/uploads": server },
  },
})
