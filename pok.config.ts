import { defineConfig } from '@pokit/core';
import { createTerminalUI } from '@pokit/terminal';
import { docs, release } from 'pok-plugins';

export default defineConfig({
  commandsDir: './commands',
  ...createTerminalUI(),
  appName: 'piq',
  plugins: [
    release({
      // All three share the root build script so local publish and CI's
      // Release workflow build identically (it also runs the ESM smoke test);
      // the plugin runs the deduplicated command once.
      packages: [
        { file: 'packages/piqit/package.json', build: 'pnpm run build' },
        { file: 'packages/resolvers/package.json', build: 'pnpm run build' },
        { file: 'packages/cli/package.json', build: 'pnpm run build' },
      ],
      verdaccio: true,
    }),
    docs({ name: 'piq-docs' }),
  ],
});
