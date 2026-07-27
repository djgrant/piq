import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@notation/docs/ui";
import { Markdown } from "@notation/docs/ui/content";
import { Heading } from "@notation/docs/ui/element";
import { Hero } from "#/views/landing/hero";
import { UseCases } from "#/views/landing/use-cases";
import example from "#/views/landing/example.md";

export const Route = createFileRoute("/")({
  component: () => (
    <>
      <SiteHeader />
      <Hero />
      <UseCases />
      <div className="page-wrap mt-6">
        <Heading variant="section">How it works</Heading>
        <Markdown tree={example} />
      </div>
    </>
  ),
});
