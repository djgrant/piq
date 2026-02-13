import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineCommand } from "@pokit/core";

async function copyDirContents(sourceDir: string, targetDir: string): Promise<void> {
  const entries = await readdir(sourceDir);
  for (const entry of entries) {
    await cp(path.join(sourceDir, entry), path.join(targetDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

export const command = defineCommand({
  label: "Build merged production site",
  run: async (r) => {
    await r.group("Build piq.dev", { layout: "sequence" }, async (g) => {
      await g.activity("Clean previous output", async () => {
        await rm("dist", { recursive: true, force: true });
      });

      await g.activity("Build VitePress docs", async () => {
        await r.exec("pnpm exec vitepress build", { cwd: "docs" });
      });

      await g.activity("Build Astro website", async () => {
        await r.exec("pnpm exec astro build", { cwd: "website" });
      });

      await g.activity("Merge build outputs", async () => {
        await mkdir("dist", { recursive: true });
        await copyDirContents("website/dist", "dist");

        await mkdir("dist/docs", { recursive: true });
        await copyDirContents("docs/.vitepress/dist", "dist/docs");

        await writeFile(
          "dist/_routes.json",
          `${JSON.stringify(
            {
              version: 1,
              include: ["/api/*"],
              exclude: [],
            },
            null,
            2,
          )}\n`,
        );
      });
    });

    r.reporter.success("Site build complete (dist/)");
  },
});
