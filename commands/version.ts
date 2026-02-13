/**
 * Version command
 *
 * Bumps version using bumpp with interactive prompts and git integration.
 * Usage: piq version [release-type]
 */

import { defineCommand } from '@pokit/core';
import { versionBump } from 'bumpp';

const PACKAGE_FILES = [
  'packages/core/package.json',
  'packages/resolvers/package.json',
];

export const command = defineCommand({
  label: 'Bump package versions',
  run: async (_r, ctx) => {
    const release = ctx.extraArgs[0] || 'prompt';
    const skipConfirm = release !== 'prompt';

    await versionBump({
      release,
      files: [...PACKAGE_FILES],
      push: true,
      tag: 'v%s',
      commit: 'release: v%s',
      preid: 'alpha',
      confirm: !skipConfirm,
    });
  },
});
