import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the production build from
  // https://<user>.github.io/budget-app/, so asset URLs need the repo name
  // as a base path there — but keep local dev serving from the root.
  base: command === 'build' ? '/budget-app/' : '/',
}))
