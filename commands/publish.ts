import { defineCommand } from "@pokit/core";
import { $ } from "bun";
import { readFileSync } from "node:fs";
import { z } from "zod";

const PACKAGES = ["piqit", "@piqit/resolvers"] as const;
const RC_VERSION_RE = /-rc(?:\.|$)/i;

const PACKAGE_PATHS: Record<string, string> = {
  piqit: "packages/piqit/package.json",
  "@piqit/resolvers": "packages/resolvers/package.json",
};

function assertRcVersions(packages: readonly string[]) {
  const nonRc: string[] = [];

  for (const pkg of packages) {
    const packagePath = PACKAGE_PATHS[pkg];
    if (!packagePath) {
      throw new Error(`Missing package path mapping for ${pkg}`);
    }

    const { version } = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    if (!version || !RC_VERSION_RE.test(version)) {
      nonRc.push(`${pkg}@${version ?? "unknown"}`);
    }
  }

  if (nonRc.length > 0) {
    throw new Error(
      `Refusing to publish non-RC versions:\n${nonRc.map((v) => `- ${v}`).join("\n")}\n\nBump to rc versions first (for example, x.y.z-rc.N).`,
    );
  }
}

export const command = defineCommand({
  label: "Publish packages",
  context: {
    dryRun: {
      from: "flag",
      schema: z.boolean().default(false),
      description: "Perform a dry run without actually publishing",
    },
    verdaccio: {
      from: "flag",
      schema: z.boolean().default(false),
      description: "Publish to local Verdaccio (default: http://localhost:4873/) instead of npmjs",
    },
  },
  run: async (r, ctx) => {
    const filterArgs = PACKAGES.map((pkg) => `--filter "${pkg}"`).join(" ");
    const dryRunFlag = ctx.context.dryRun ? " --dry-run" : "";
    const registry = ctx.context.verdaccio
      ? process.env.VERDACCIO_REGISTRY || "http://localhost:4873/"
      : "https://registry.npmjs.org/";

    if (!ctx.context.dryRun) {
      assertRcVersions(PACKAGES);
    }

    const whoamiResult = await $`npm whoami --registry ${registry}`.quiet().nothrow();
    if (whoamiResult.exitCode !== 0) {
      throw new Error(`Not logged in for registry ${registry}. Run: npm login --registry ${registry}`);
    }

    await r.group(`Publish to ${registry}`, { layout: "sequence" }, async (g) => {
      await g.activity("Install workspace dependencies", async () => {
        await r.exec("pnpm install --frozen-lockfile");
      });

      await g.activity("Build packages", async () => {
        await r.exec("bun tsc --build");
      });

      await g.activity(`Publish ${PACKAGES.length} packages`, async () => {
        const gitCheckFlag = ctx.context.dryRun || ctx.context.verdaccio ? " --no-git-checks" : "";
        await r.exec(
          `pnpm ${filterArgs} publish --access public --registry ${registry}${dryRunFlag}${gitCheckFlag}`,
          {
            interactive: !ctx.context.dryRun,
          },
        );
      });
    });

    if (ctx.context.dryRun) {
      r.reporter.info("Dry run complete. No packages were published.");
    } else {
      r.reporter.success(`Published ${PACKAGES.length} packages to ${registry}`);
    }
  },
});
