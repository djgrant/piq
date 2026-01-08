import { describe, test, expect } from "bun:test";
import { join } from "path";
import { frontmatterResolver, readFrontmatterStreaming } from "../src/frontmatter-resolver";

const fixturesPath = join(import.meta.dir, "fixtures");

describe("frontmatterResolver", () => {
  test("extracts all frontmatter fields", async () => {
    const resolver = frontmatterResolver<{
      title: string;
      tags: string[];
      author: string;
    }>();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md")
    );

    expect(result).toEqual({
      title: "Hello World",
      tags: ["intro", "welcome"],
      author: "John Doe",
    });
  });

  test("extracts only requested fields", async () => {
    const resolver = frontmatterResolver<{
      title: string;
      tags: string[];
      author: string;
    }>();

    const result = await resolver.resolve(
      join(fixturesPath, "content/posts/2024/hello-world.md"),
      ["title"]
    );

    expect(result).toEqual({ title: "Hello World" });
    expect(result).not.toHaveProperty("tags");
    expect(result).not.toHaveProperty("author");
  });

  test("returns empty object for file without frontmatter", async () => {
    // Create a file without frontmatter for this test
    const testFile = join(fixturesPath, "no-frontmatter.md");
    await Bun.write(testFile, "# No Frontmatter\n\nJust content.");

    const resolver = frontmatterResolver<{ title: string }>();
    const result = await resolver.resolve(testFile);

    expect(result).toEqual({});

    // Cleanup
    await Bun.file(testFile).unlink();
  });

  test("handles work package frontmatter", async () => {
    const resolver = frontmatterResolver<{
      category: string;
      size: string;
    }>();

    const result = await resolver.resolve(
      join(fixturesPath, "work/todo/wp-1-build-feature.md")
    );

    expect(result).toEqual({
      category: "feature",
      size: "md",
    });
  });
});

describe("readFrontmatterStreaming", () => {
  test("extracts frontmatter via streaming", async () => {
    const result = await readFrontmatterStreaming(
      join(fixturesPath, "content/posts/2024/hello-world.md")
    );

    expect(result).toEqual({
      title: "Hello World",
      tags: ["intro", "welcome"],
      author: "John Doe",
    });
  });

  test("returns null for file without frontmatter", async () => {
    const testFile = join(fixturesPath, "no-frontmatter-stream.md");
    await Bun.write(testFile, "# No Frontmatter\n\nJust content.");

    const result = await readFrontmatterStreaming(testFile);

    expect(result).toBeNull();

    // Cleanup
    await Bun.file(testFile).unlink();
  });
});
