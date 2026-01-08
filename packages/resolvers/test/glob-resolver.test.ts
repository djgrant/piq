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

      const results = await resolver.search();

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.params.slug).sort()).toEqual([
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

      const results = await resolver.search();
      const helloWorld = results.find((r) => r.params.slug === "hello-world");

      expect(helloWorld?.params).toEqual({
        year: "2024",
        slug: "hello-world",
      });
    });

    test("filters by constraint", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const results = await resolver.search({ year: "2024" });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.params.year === "2024")).toBe(true);
    });

    test("returns absolute paths", async () => {
      const resolver = globResolver<{ year: string; slug: string }>({
        base: join(fixturesPath, "content"),
        path: "posts/{year}/{slug}.md",
      });

      const results = await resolver.search();

      expect(results.every((r) => r.path.startsWith("/"))).toBe(true);
    });

    test("handles pattern with static prefix", async () => {
      const resolver = globResolver<{ status: string; priority: string; name: string }>({
        base: join(fixturesPath, "work"),
        path: "{status}/wp-{priority}-{name}.md",
      });

      const results = await resolver.search({ status: "todo" });

      expect(results).toHaveLength(1);
      expect(results[0].params).toEqual({
        status: "todo",
        priority: "1",
        name: "build-feature",
      });
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
});
