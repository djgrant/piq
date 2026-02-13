import { defineCommand, defineCheck } from "@pokit/core";
import { $ } from "bun";
import { z } from "zod";

const PACKAGES = ["piqit", "@piqit/resolvers"] as const;

const npmLoggedIn = defineCheck({
  label: "npm login",
  check: async () => {
    const result = await $`npm whoami`.quiet().nothrow();
    if (result.exitCode !== 0) {
      throw new Error("Not logged in to npm");
    }
  },
  remediation: ["Run: npm login"],
});

export const command = defineCommand({
  label: "Publish packages to npm",
  pre: [npmLoggedIn],
  context: {
    dryRun: {
      from: "flag",
      schema: z.boolean().default(false),
      description: "Perform a dry run without actually publishing",
    },
  },
  run: async (r, ctx) => {
    const filterArgs = PACKAGES.map((pkg) => `--filter "${pkg}"`).join(" ");
    const dryRunFlag = ctx.context.dryRun ? " --dry-run" : "";

    await r.group("Publish to npm", { layout: "sequence" }, async (g) => {
      await g.activity("Install workspace dependencies", async () => {
        await r.exec("pnpm install --frozen-lockfile");
      });

      await g.activity("Build packages", async () => {
        await r.exec("bun tsc --build");
      });

      await g.activity(`Publish ${PACKAGES.length} packages`, async () => {
        const gitCheckFlag = ctx.context.dryRun ? " --no-git-checks" : "";
        await r.exec(
          `pnpm ${filterArgs} publish --access public${dryRunFlag}${gitCheckFlag}`,
          {
            interactive: !ctx.context.dryRun,
          },
        );
      });
    });

    if (ctx.context.dryRun) {
      r.reporter.info("Dry run complete. No packages were published.");
    } else {
      r.reporter.success(`Published ${PACKAGES.length} packages to npm`);
    }
  },
});
