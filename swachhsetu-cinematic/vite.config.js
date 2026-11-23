import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5178,
    strictPort: false,
  },
  preview: {
    port: 4178,
  },
  build: {
    target: 'es2020',
  },
});
