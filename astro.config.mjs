import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zerobudgeting.com',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
  build: { format: 'file' },
});
