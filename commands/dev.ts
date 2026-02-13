/**
 * Dev command
 *
 * Starts the website and docs dev servers in a tabbed terminal UI.
 */

import { defineCommand } from '@pokit/core';

export const command = defineCommand({
  label: 'Start dev servers',
  run: async (r) => {
    await r.tabs([
      r.exec('astro dev', { cwd: 'website' }),
      r.exec('vitepress dev --port 5174', { cwd: 'docs' }),
    ], { name: 'Development' });
  },
});
