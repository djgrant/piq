import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'piq',
  description: 'A cost-aware query layer for document collections',
  base: '/docs/',

  themeConfig: {
    siteTitle: 'piq',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/api' },
      { text: 'Packages', link: '/packages/' },
      { text: 'Playground', link: '/playground' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Concepts', link: '/guide/concepts' },
            { text: 'Recipes', link: '/guide/recipes' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API', link: '/reference/api' },
            { text: 'Resolvers', link: '/reference/resolvers' },
            { text: 'Resolver Types', link: '/reference/types' },
          ],
        },
        {
          text: 'Packages',
          items: [
            { text: 'Overview', link: '/packages/' },
            { text: 'piqit', link: '/packages/piqit' },
            { text: '@piqit/resolvers', link: '/packages/resolvers' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/djgrant/piq' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'MIT License',
      copyright: 'Created by <a href="https://danielgrant.co">Daniel Grant</a>',
    },
  },
})
