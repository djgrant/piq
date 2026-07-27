import type { DocCategory } from "@notation/docs/config";

export const manual: DocCategory = {
  label: "User Manual",
  slug: "manual",
  sections: [
    {
      heading: "Getting Started",
      icon: "rocket",
      links: [
        { label: "Introduction", slug: "manual/introduction" },
        { label: "Installation", slug: "manual/installation" },
        { label: "Quick Start", slug: "manual/quickstart" },
      ],
    },
    {
      heading: "Queries",
      icon: "cpu",
      links: [
        { label: "Query Pipeline", slug: "manual/query-pipeline" },
        { label: "Recipes", slug: "manual/recipes" },
      ],
    },
    {
      heading: "Resolvers",
      icon: "layers",
      links: [{ label: "Resolvers", slug: "manual/resolvers" }],
    },
    {
      heading: "CLI",
      icon: "terminal",
      links: [{ label: "CLI", slug: "manual/cli" }],
    },
  ],
};
