import { defineConfig } from '@pokit/core';
import { createReporterAdapter } from '@pokit/reporter-clack';
import { createPrompter } from '@pokit/prompter-clack';
import { createTabsAdapter } from '@pokit/tabs-ink';

export default defineConfig({
  commandsDir: './commands',
  reporter: createReporterAdapter(),
  prompter: createPrompter(),
  tabs: createTabsAdapter(),
  appName: 'piq',
});
