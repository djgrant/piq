import type { DocCategory } from "@notation/docs/config";

export const packages: DocCategory = {
  label: "Packages",
  slug: "packages",
  sections: [
    {
      heading: "Reference",
      icon: "terminal",
      links: [
        { label: "piqit", slug: "packages/piqit" },
        { label: "@piqit/resolvers", slug: "packages/resolvers" },
        { label: "@piqit/cli", slug: "packages/cli" },
      ],
    },
  ],
};
