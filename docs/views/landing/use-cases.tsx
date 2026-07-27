import { Section } from "@notation/docs/ui/layout";
import { Heading, Text } from "@notation/docs/ui/element";

export const UseCases = () => (
  <Section>
    <div className="bleed-full">
      <div className="page-wrap py-8 md:py-10">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <Heading variant="section" className="mb-4">
              When to use piq
            </Heading>
            <ul className="space-y-2 opacity-70">
              <li>
                <Text>→ Agent workflows that generate and query millions of files</Text>
              </li>
              <li>
                <Text>→ Runtime environments where memory and I/O are expensive</Text>
              </li>
              <li>
                <Text>→ When you want explicit control over resolution cost</Text>
              </li>
              <li>
                <Text>→ Projects where you can design query patterns upfront</Text>
              </li>
            </ul>
          </div>
          <div>
            <Heading variant="section" className="mb-4">
              When not to use piq
            </Heading>
            <ul className="space-y-2 opacity-70">
              <li>
                <Text>× You need writes, updates, or transactions</Text>
              </li>
              <li>
                <Text>× You need joins at the query layer</Text>
              </li>
              <li>
                <Text>× You are running ad-hoc analytical queries</Text>
              </li>
              <li>
                <Text>× You don't want to predesign your access patterns</Text>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Section>
);
