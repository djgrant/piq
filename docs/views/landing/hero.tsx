import { Button } from "@notation/docs/ui/element";
import { GitHub } from "@notation/docs/ui/icon";
import { Section } from "@notation/docs/ui/layout";
import { Heading, Text } from "@notation/docs/ui/element";
import { Link } from "@tanstack/react-router";

export const Hero = () => (
  <Section className="border-b">
    <div className="bleed-full">
      <div className="page-wrap py-8 md:py-10">
        <div className="max-w-3xl">
          <Heading as="h1" variant="title" className="mb-6">
            Cost-aware query client for document storage
          </Heading>
          <div className="space-y-3 lg:space-y-5 opacity-70">
            <Text>
              Turn filesystems, S3 buckets, Git repos, and external APIs into a structured,
              queryable interface.
            </Text>
          </div>
          <div className="flex gap-4 mt-9">
            <Button as="a" href="https://github.com/djgrant/piq" variant="default" size="sm">
              <GitHub className="-ml-1 sm:-ml-2.5 w-5 h-5" />
              Github
            </Button>
            <Button as={Link} to="/docs" variant="outline" size="sm">
              Docs →
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Section>
);
