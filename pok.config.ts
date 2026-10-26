import { defineConfig } from '@pokit/core';
import { docs, release } from 'pok-plugins';

export default defineConfig({
  commandsDir: './commands',
  appName: 'piq',
  plugins: [
    release({
      // All three share the root build script (it also runs the ESM smoke
      // test); the plugin runs the deduplicated command once.
      packages: [
        { file: 'packages/piqit/package.json', build: 'pnpm run build' },
        { file: 'packages/resolvers/package.json', build: 'pnpm run build' },
        { file: 'packages/cli/package.json', build: 'pnpm run build' },
      ],
    }),
    docs({ name: 'piq-docs' }),
  ],
});
