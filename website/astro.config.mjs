// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    starlight({
      title: 'piq',
      description: 'A cost-aware query layer for document collections',
      sidebar: [
        {
          label: 'Guide',
          items: [
            { label: 'Getting Started', slug: 'docs' },
            { label: 'Concepts', slug: 'docs/concepts' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'API', slug: 'docs/api' },
            { label: 'Resolvers', slug: 'docs/resolvers' },
          ],
        },
      ],
      customCss: ['./src/styles/starlight.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/djgrant/piq' },
      ],
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  },
});
