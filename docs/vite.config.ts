import { defineConfig } from "vite";
import { docs } from "@notation/docs";

export default defineConfig({
  plugins: [
    docs({
      title: "piq – Cost-aware query client for document storage",
      github: "https://github.com/djgrant/piq",
      favicon: { href: "/favicon-32x32.png", type: "image/svg+xml" },
      categories: ["manual", "packages"],
      // The site now lives inside the docs directory it publishes, so the
      // Markdown and nav metadata sit alongside this config.
      contentDirectory: ".",
      pagesDirectory: "pages",
      logo: "./views/logo.tsx",
      version: { packageJson: "packages/piqit/package.json" },
      deployment: {
        name: "piq-docs",
        compatibilityDate: "2025-09-24",
        compatibilityFlags: ["nodejs_compat"],
      },
    }),
  ],
});
