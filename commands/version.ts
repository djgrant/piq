import { defineCommand } from "@pokit/core";
import { versionBump } from "bumpp";

const PACKAGE_FILES = [
  "packages/piqit/package.json",
  "packages/resolvers/package.json",
];

export const command = defineCommand({
  label: "Bump package versions",
  run: async (_r, ctx) => {
    const release = ctx.extraArgs[0] || "prompt";
    const skipConfirm = release !== "prompt";

    await versionBump({
      release,
      files: [...PACKAGE_FILES],
      push: true,
      tag: "v%s",
      commit: "release: v%s",
      preid: "rc",
      confirm: !skipConfirm,
    });
  },
});
