import { describe, test, expect } from "bun:test";
import { join } from "path";
import { globResolver } from "../src/glob-resolver";

const fixturesPath = join(import.meta.dir, "fixtures");

describe("globResolver", () => {
  describe("search", () => {
    test("finds all files matching pattern", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths = await resolver.search();

      expect(paths).toHaveLength(3);
      // Extract params for each path to verify content
      const slugs = paths.map((p) => resolver.extractParams(p).slug).sort();
      expect(slugs).toEqual([
        "hello-world",
        "old-post",
        "second-post",
      ]);
    });

    test("extracts params from path", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths = await resolver.search();
      const helloWorldPath = paths.find((p) => p.includes("hello-world"));
      const params = resolver.extractParams(helloWorldPath!);

      expect(params).toEqual({
        year: "2024",
        slug: "hello-world",
      });
    });

    test("filters by constraint", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths = await resolver.search({ year: "2024" });

      expect(paths).toHaveLength(2);
      // Verify all paths have year 2024
      expect(paths.every((p) => resolver.extractParams(p).year === "2024")).toBe(true);
    });

    test("returns absolute paths", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths = await resolver.search();

      expect(paths.every((p) => p.startsWith("/"))).toBe(true);
    });

    test("handles pattern with static prefix", async () => {
      const resolver = globResolver<{ status: string; priority: string; name: string }>({
        base: join(fixturesPath, "work"),
        path: "{status}/wp-{priority}-{name}.md",
      });

      const paths = await resolver.search({ status: "todo" });

      expect(paths).toHaveLength(1);
      expect(resolver.extractParams(paths[0])).toEqual({
        status: "todo",
        priority: "1",
        name: "build-feature",
      });
    });
  });

  describe("extractParams", () => {
    test("extracts params from valid path", () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const path = join(fixturesPath, "content", "posts/2024/hello-world.md");
      const params = resolver.extractParams(path);

      expect(params).toEqual({
        year: "2024",
        slug: "hello-world",
      });
    });

    test("throws for non-matching path", () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const path = join(fixturesPath, "content", "invalid/path.txt");

      expect(() => resolver.extractParams(path)).toThrow("Path does not match pattern");
    });
  });

  describe("getPath", () => {
    test("builds path from params", () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const path = resolver.getPath!({ year: "2024", slug: "new-post" });

      expect(path).toBe(join(fixturesPath, "content", "posts/2024/new-post.md"));
    });

    test("throws for missing required param", () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      expect(() => resolver.getPath!({ year: "2024" } as { year: string; slug: string })).toThrow(
        "Missing required parameter: slug"
      );
    });
  });

  describe("scan", () => {
    test("yields all files matching pattern as async generator", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths: string[] = [];
      for await (const path of resolver.scan!()) {
        paths.push(path);
      }

      expect(paths).toHaveLength(3);
      const slugs = paths.map((p) => resolver.extractParams(p).slug).sort();
      expect(slugs).toEqual(["hello-world", "old-post", "second-post"]);
    });

    test("filters by constraint", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths: string[] = [];
      for await (const path of resolver.scan!({ year: "2024" })) {
        paths.push(path);
      }

      expect(paths).toHaveLength(2);
      expect(paths.every((p) => resolver.extractParams(p).year === "2024")).toBe(true);
    });

    test("supports early termination", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const paths: string[] = [];
      for await (const path of resolver.scan!()) {
        paths.push(path);
        if (paths.length >= 1) break; // Early termination
      }

      expect(paths).toHaveLength(1);
    });

    test("returns absolute paths", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      for await (const path of resolver.scan!()) {
        expect(path.startsWith("/")).toBe(true);
      }
    });
  });
});
