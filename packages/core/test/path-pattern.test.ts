import { describe, test, expect } from "bun:test";
import { compilePattern, compileValidationRegex, matchPattern, buildPath } from "../src/path-pattern";

describe("compilePattern", () => {
  test("compiles simple required param", () => {
    const compiled = compilePattern("{slug}.md");

    expect(compiled.params).toHaveLength(1);
    expect(compiled.params[0]).toEqual({
      name: "slug",
      type: "required",
      position: 0,
    });
    expect(compiled.staticPrefix).toBe("");
  });

  test("compiles pattern with static prefix", () => {
    const compiled = compilePattern("posts/{slug}.md");

    expect(compiled.staticPrefix).toBe("posts/");
    expect(compiled.params[0].name).toBe("slug");
  });

  test("compiles multiple required params", () => {
    const compiled = compilePattern("{year}/{month}/{slug}.md");

    expect(compiled.params).toHaveLength(3);
    expect(compiled.params.map((p) => p.name)).toEqual(["year", "month", "slug"]);
  });

  test("compiles optional param", () => {
    const compiled = compilePattern("posts/{?date}/{slug}.md");

    expect(compiled.params).toHaveLength(2);
    expect(compiled.params[0]).toEqual({
      name: "date",
      type: "optional",
      position: 0,
    });
  });

  test("compiles splat param", () => {
    const compiled = compilePattern("content/{...rest}");

    expect(compiled.params).toHaveLength(1);
    expect(compiled.params[0]).toEqual({
      name: "rest",
      type: "splat",
      position: 0,
    });
  });

  test("compiles mixed params", () => {
    const compiled = compilePattern("{status}/{?date}/wp-{priority}-{name}.md");

    expect(compiled.params).toHaveLength(4);
    expect(compiled.params.map((p) => ({ name: p.name, type: p.type }))).toEqual([
      { name: "status", type: "required" },
      { name: "date", type: "optional" },
      { name: "priority", type: "required" },
      { name: "name", type: "required" },
    ]);
  });
});

describe("matchPattern", () => {
  test("matches simple required param", () => {
    const compiled = compilePattern("{slug}.md");
    const result = matchPattern(compiled, "hello-world.md");

    expect(result).toEqual({ slug: "hello-world" });
  });

  test("matches path with static prefix", () => {
    const compiled = compilePattern("posts/{slug}.md");
    const result = matchPattern(compiled, "posts/my-post.md");

    expect(result).toEqual({ slug: "my-post" });
  });

  test("returns null for non-matching path", () => {
    const compiled = compilePattern("posts/{slug}.md");
    const result = matchPattern(compiled, "pages/my-page.md");

    expect(result).toBeNull();
  });

  test("matches multiple required params", () => {
    const compiled = compilePattern("{year}/{month}/{slug}.md");
    const result = matchPattern(compiled, "2024/01/new-year.md");

    expect(result).toEqual({
      year: "2024",
      month: "01",
      slug: "new-year",
    });
  });

  test("matches optional param when present", () => {
    const compiled = compilePattern("posts/{?date}/{slug}.md");
    const result = matchPattern(compiled, "posts/2024-01-01/new-year.md");

    expect(result).toEqual({
      date: "2024-01-01",
      slug: "new-year",
    });
  });

  test("matches pattern when optional param is absent", () => {
    const compiled = compilePattern("posts/{?date}/{slug}.md");
    const result = matchPattern(compiled, "posts/new-year.md");

    expect(result).toEqual({ slug: "new-year" });
  });

  test("matches splat param", () => {
    const compiled = compilePattern("content/{...rest}");
    const result = matchPattern(compiled, "content/deep/nested/path.md");

    expect(result).toEqual({ rest: "deep/nested/path.md" });
  });

  test("matches work package pattern", () => {
    const compiled = compilePattern("{status}/{?date}/wp-{priority}-{name}.md");

    const result1 = matchPattern(compiled, "todo/wp-1-build-feature.md");
    expect(result1).toEqual({
      status: "todo",
      priority: "1",
      name: "build-feature",
    });

    const result2 = matchPattern(compiled, "in-progress/2024-01-08/wp-2-refactor.md");
    expect(result2).toEqual({
      status: "in-progress",
      date: "2024-01-08",
      priority: "2",
      name: "refactor",
    });
  });
});

describe("buildPath", () => {
  test("builds path with required params", () => {
    const compiled = compilePattern("posts/{year}/{slug}.md");
    const path = buildPath(compiled, { year: "2024", slug: "hello" });

    expect(path).toBe("posts/2024/hello.md");
  });

  test("throws for missing required param", () => {
    const compiled = compilePattern("posts/{year}/{slug}.md");

    expect(() => buildPath(compiled, { year: "2024" })).toThrow(
      "Missing required parameter: slug"
    );
  });

  test("builds path with optional param present", () => {
    const compiled = compilePattern("posts/{?date}/{slug}.md");
    const path = buildPath(compiled, { date: "2024-01-01", slug: "hello" });

    expect(path).toBe("posts/2024-01-01/hello.md");
  });

  test("builds path with optional param absent", () => {
    const compiled = compilePattern("posts/{?date}/{slug}.md");
    const path = buildPath(compiled, { slug: "hello" });

    expect(path).toBe("posts/hello.md");
  });
});

describe("toGlob", () => {
  test("generates glob for pattern without constraints", () => {
    const compiled = compilePattern("{year}/{slug}.md");
    const glob = compiled.toGlob();

    expect(glob).toBe("*/*.md");
  });

  test("generates glob with constraint applied", () => {
    const compiled = compilePattern("{year}/{slug}.md");
    const glob = compiled.toGlob({ year: "2024" });

    expect(glob).toBe("2024/*.md");
  });

  test("generates glob with multiple constraints", () => {
    const compiled = compilePattern("{status}/wp-{priority}-{name}.md");
    const glob = compiled.toGlob({ status: "todo", priority: "1" });

    expect(glob).toBe("todo/wp-1-*.md");
  });

  test("generates glob with splat", () => {
    const compiled = compilePattern("content/{...rest}");
    const glob = compiled.toGlob();

    expect(glob).toBe("content/**");
  });
});

describe("compileValidationRegex", () => {
  test("validates simple required param pattern", () => {
    const regex = compileValidationRegex("{slug}.md");

    expect(regex.test("hello-world.md")).toBe(true);
    expect(regex.test("hello.md")).toBe(true);
    expect(regex.test("hello")).toBe(false);
    expect(regex.test("dir/hello.md")).toBe(false);
  });

  test("validates pattern with static prefix", () => {
    const regex = compileValidationRegex("posts/{slug}.md");

    expect(regex.test("posts/my-post.md")).toBe(true);
    expect(regex.test("pages/my-post.md")).toBe(false);
    expect(regex.test("my-post.md")).toBe(false);
  });

  test("validates multiple required params", () => {
    const regex = compileValidationRegex("{year}/{month}/{slug}.md");

    expect(regex.test("2024/01/new-year.md")).toBe(true);
    expect(regex.test("2024/new-year.md")).toBe(false);
  });

  test("validates optional param when present", () => {
    const regex = compileValidationRegex("posts/{?date}/{slug}.md");

    expect(regex.test("posts/2024-01-01/new-year.md")).toBe(true);
    expect(regex.test("posts/new-year.md")).toBe(true);
  });

  test("validates splat param", () => {
    const regex = compileValidationRegex("content/{...rest}");

    expect(regex.test("content/deep/nested/path.md")).toBe(true);
    expect(regex.test("content/")).toBe(true);
    expect(regex.test("content/file.md")).toBe(true);
    expect(regex.test("other/path")).toBe(false);
  });

  test("uses non-capturing groups (faster than capturing)", () => {
    const regex = compileValidationRegex("{year}/{slug}.md");
    const match = "2024/hello.md".match(regex);

    // Non-capturing groups don't populate match array with captured values
    // Only the full match should be present
    expect(match).not.toBeNull();
    expect(match!.length).toBe(1); // Only the full match, no capture groups
  });

  test("produces equivalent validation to compilePattern regex", () => {
    const pattern = "{status}/{?date}/wp-{priority}-{name}.md";
    const validationRegex = compileValidationRegex(pattern);
    const captureRegex = compilePattern(pattern).regex;

    const paths = [
      "todo/wp-1-build-feature.md",
      "in-progress/2024-01-08/wp-2-refactor.md",
      "done/wp-3-cleanup.md",
      "invalid.md",
      "todo/extra/wp-1-test.md",
    ];

    for (const path of paths) {
      expect(validationRegex.test(path)).toBe(captureRegex.test(path));
    }
  });
});
