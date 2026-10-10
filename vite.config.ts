import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le mode « pages » sert le site sous https://akhimysah.github.io/parnassa-cashback/.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'pages' ? '/parnassa-cashback/' : '/',
  server: { port: 5220 },
}));
