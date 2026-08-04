import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://zerobudgeting.com',
  output: 'static',
  integrations: [tailwind()],
  build: { format: 'file' },
});
