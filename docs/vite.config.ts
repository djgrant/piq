import { defineConfig } from "vite";
import { docs } from "@notation/docs";

export default defineConfig({
  plugins: [
    docs({
      title: "piq – Cost-aware query client for document storage",
      github: "https://github.com/djgrant/piq",
      favicon: { href: "/favicon-32x32.png", type: "image/svg+xml" },
      categories: ["manual", "packages"],
      // Served at notation.dev/piq rather than on its own subdomain.
      basePath: "/piq",
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
        // notation.dev itself is the notation-docs Custom Domain; routes run
        // ahead of it, so these paths reach this Worker instead.
        routes: [
          { pattern: "notation.dev/piq", zoneName: "notation.dev" },
          { pattern: "notation.dev/piq/*", zoneName: "notation.dev" },
        ],
      },
    }),
  ],
});
