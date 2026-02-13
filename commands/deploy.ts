import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Deploy website to Cloudflare Pages",
  run: async (r) => {
    await r.group("Deploy piq.dev", { layout: "sequence" }, async (g) => {
      await g.activity("Build site", async () => {
        await r.exec("./commands/build.sh");
      });

      await g.activity("Deploy to Cloudflare Pages", async () => {
        await r.exec("pnpx wrangler pages deploy");
      });
    });

    r.reporter.success("Deployed to Cloudflare Pages");
  },
});
