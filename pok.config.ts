import { defineConfig } from '@pokit/core';
import { createTerminalUI } from '@pokit/terminal';
import { release } from 'pok-plugins';

export default defineConfig({
  commandsDir: './commands',
  ...createTerminalUI(),
  appName: 'piq',
  plugins: [
    release({
      packages: {
        files: [
          'packages/piqit/package.json',
          'packages/resolvers/package.json',
          'packages/cli/package.json',
        ],
        names: ['piqit', '@piqit/resolvers', '@piqit/cli'],
      },
      verdaccio: true,
      build: 'bun tsc --build',
    }),
  ],
});
