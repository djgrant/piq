import { describe, test, expect } from "bun:test";
import { join } from "path";
import { markdownResolver } from "../src/markdown-resolver";

const fixturesPath = join(import.meta.dir, "fixtures");

describe("markdownResolver", () => {
  test("extracts raw content without frontmatter", async () => {
    const resolver = markdownResolver();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md")
    );

    expect(result.raw).not.toContain("---");
    expect(result.raw).not.toContain("title: Hello World");
    expect(result.raw).toContain("# Hello World");
  });

  test("renders markdown to HTML", async () => {
    const resolver = markdownResolver();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md")
    );

    expect(result.html).toContain("<h1>Hello World</h1>");
    expect(result.html).toContain("<h2>Getting Started</h2>");
  });

  test("extracts headings", async () => {
    const resolver = markdownResolver();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md")
    );

    expect(result.headings).toHaveLength(2);
    expect(result.headings[0]).toEqual({
      depth: 1,
      text: "Hello World",
      slug: "hello-world",
    });
    expect(result.headings[1]).toEqual({
      depth: 2,
      text: "Getting Started",
      slug: "getting-started",
    });
  });

  test("resolves only requested fields", async () => {
    const resolver = markdownResolver();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md"),
      ["headings"]
    );

    expect(result.headings).toHaveLength(2);
    expect(result.raw).toBe("");
    expect(result.html).toBe("");
  });

  test("uses custom render function", async () => {
    const resolver = markdownResolver({
      render: (md) => `<custom>${md}</custom>`,
    });

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/second-post.md")
    );

    expect(result.html).toContain("<custom>");
    expect(result.html).toContain("# Second Post");
    expect(result.html).toContain("</custom>");
  });

  test("generates unique slugs for headings", async () => {
    const resolver = markdownResolver();

    const result = await resolver.resolve(
      join(fixturesPath, "work/todo/wp-1-build-feature.md")
    );

    expect(result.headings).toContainEqual({
      depth: 1,
      text: "Build Feature",
      slug: "build-feature",
    });
    expect(result.headings).toContainEqual({
      depth: 2,
      text: "Goal",
      slug: "goal",
    });
    expect(result.headings).toContainEqual({
      depth: 2,
      text: "Approach",
      slug: "approach",
    });
  });
});

describe("default markdown renderer", () => {
  test("renders bold text", async () => {
    const testFile = join(fixturesPath, "bold-test.md");
    await Bun.write(testFile, "This is **bold** text.");

    const resolver = markdownResolver();
    const result = await resolver.resolve(testFile);

    expect(result.html).toContain("<strong>bold</strong>");

    await Bun.file(testFile).unlink();
  });

  test("renders italic text", async () => {
    const testFile = join(fixturesPath, "italic-test.md");
    await Bun.write(testFile, "This is *italic* text.");

    const resolver = markdownResolver();
    const result = await resolver.resolve(testFile);

    expect(result.html).toContain("<em>italic</em>");

    await Bun.file(testFile).unlink();
  });

  test("renders inline code", async () => {
    const testFile = join(fixturesPath, "code-test.md");
    await Bun.write(testFile, "Use `console.log()` to debug.");

    const resolver = markdownResolver();
    const result = await resolver.resolve(testFile);

    expect(result.html).toContain("<code>console.log()</code>");

    await Bun.file(testFile).unlink();
  });

  test("renders links", async () => {
    const testFile = join(fixturesPath, "link-test.md");
    await Bun.write(testFile, "Visit [Google](https://google.com) today.");

    const resolver = markdownResolver();
    const result = await resolver.resolve(testFile);

    expect(result.html).toContain('<a href="https://google.com">Google</a>');

    await Bun.file(testFile).unlink();
  });
});
