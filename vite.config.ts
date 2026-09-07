import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH || '/wablind/';
  return { plugins: [react()], base, build: { sourcemap: false } };
});
