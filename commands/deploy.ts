/**
 * Deploy command
 *
 * Builds the unified site (VitePress docs + Astro playground/API) and deploys to Cloudflare Pages.
 */

import { defineCommand } from '@pokit/core';

export const command = defineCommand({
  label: 'Deploy website to Cloudflare Pages',
  run: async (r) => {
    await r.group('Deploy piq.dev', { layout: 'sequence' }, async (g) => {
      await g.activity('Build site', async () => {
        await r.exec('./scripts/build.sh');
      });

      await g.activity('Deploy to Cloudflare Pages', async () => {
        await r.exec('npx wrangler pages deploy dist --project-name=piq');
      });
    });

    r.reporter.success('Deployed to Cloudflare Pages');
  },
});
