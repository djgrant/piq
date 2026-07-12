/**
 * Version command
 *
 * Bumps the publishable packages with bumpp: interactive prompt, git commit,
 * and a `v%s` tag. Pushing the tag triggers the Release workflow, which
 * publishes to npm via OIDC trusted publishing.
 *
 * Usage: pok version [release-type]   (e.g. pok version patch)
 */

import { defineCommand } from "@pokit/core";
import { versionBump } from "bumpp";
import { z } from "zod";

const PACKAGE_FILES = [
  "packages/piqit/package.json",
  "packages/resolvers/package.json",
  "packages/cli/package.json",
];

export const command = defineCommand({
  label: "Bump package versions",
  context: {
    skipPush: {
      from: "flag",
      schema: z.boolean().optional(),
      description: "Skip pushing the commit and tag to remote",
    },
  },
  run: async (_r, ctx) => {
    const release = ctx.extraArgs[0] || "prompt";
    const skipConfirm = release !== "prompt";

    await versionBump({
      release,
      files: [...PACKAGE_FILES],
      push: !ctx.context.skipPush,
      tag: "v%s",
      commit: "release: v%s",
      preid: "rc",
      confirm: !skipConfirm,
    });
  },
});
