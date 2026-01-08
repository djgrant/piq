import { describe, test, expect, beforeEach } from "bun:test";
import {
  defineCollection,
  registerCollections,
  clearCollections,
} from "../src/collection";
import { piq, QueryBuilder } from "../src/query";
import type {
  SearchResolver,
  MetaResolver,
  BodyResolver,
  StandardSchema,
  SearchResult,
} from "../src/types";

// Mock schema
function mockSchema<T>(): StandardSchema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => ({ value: value as T }),
    },
  };
}

// Test data
interface TestSearch {
  status: string;
  name: string;
}

interface TestMeta {
  title: string;
  category: string;
}

interface TestBody {
  html: string;
}

const testFiles: SearchResult<TestSearch>[] = [
  { path: "/work/todo/task-1.md", params: { status: "todo", name: "task-1" } },
  { path: "/work/todo/task-2.md", params: { status: "todo", name: "task-2" } },
  { path: "/work/done/task-3.md", params: { status: "done", name: "task-3" } },
];

const testMeta: Record<string, TestMeta> = {
  "/work/todo/task-1.md": { title: "Task 1", category: "docs" },
  "/work/todo/task-2.md": { title: "Task 2", category: "code" },
  "/work/done/task-3.md": { title: "Task 3", category: "docs" },
};

const testBody: Record<string, TestBody> = {
  "/work/todo/task-1.md": { html: "<p>Task 1 content</p>" },
  "/work/todo/task-2.md": { html: "<p>Task 2 content</p>" },
  "/work/done/task-3.md": { html: "<p>Task 3 content</p>" },
};

// Mock resolvers
function createMockSearchResolver(): SearchResolver<TestSearch> {
  return {
    async search(constraints?: Partial<TestSearch>) {
      if (!constraints) {
        return testFiles;
      }
      return testFiles.filter((f) => {
        for (const [key, value] of Object.entries(constraints)) {
          if (f.params[key as keyof TestSearch] !== value) {
            return false;
          }
        }
        return true;
      });
    },
  };
}

function createMockMetaResolver(): MetaResolver<TestMeta> {
  return {
    async resolve(path: string, fields?: (keyof TestMeta)[]) {
      const meta = testMeta[path];
      if (!meta) return {} as TestMeta;
      if (!fields) return meta;
      const result: Partial<TestMeta> = {};
      for (const field of fields) {
        result[field] = meta[field];
      }
      return result as TestMeta;
    },
  };
}

function createMockBodyResolver(): BodyResolver<TestBody> {
  return {
    async resolve(path: string) {
      return testBody[path] || { html: "" };
    },
  };
}

describe("QueryBuilder", () => {
  beforeEach(() => {
    clearCollections();

    registerCollections({
      tasks: defineCollection({
        searchSchema: mockSchema<TestSearch>(),
        searchResolver: createMockSearchResolver(),
        metaSchema: mockSchema<TestMeta>(),
        metaResolver: createMockMetaResolver(),
        bodySchema: mockSchema<TestBody>(),
        bodyResolver: createMockBodyResolver(),
      }),
    });
  });

  describe("search", () => {
    test("returns all results with wildcard", async () => {
      const results = await piq.from("tasks").search("*").exec();

      expect(results).toHaveLength(3);
    });

    test("filters by search constraints", async () => {
      const results = await piq
        .from<TestSearch>("tasks")
        .search({ status: "todo" })
        .exec();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.search.status === "todo")).toBe(true);
    });

    test("returns search params in results", async () => {
      const results = await piq
        .from<TestSearch>("tasks")
        .search({ status: "done" })
        .exec();

      expect(results[0].search).toEqual({ status: "done", name: "task-3" });
    });
  });

  describe("filter", () => {
    test("filters by meta constraints", async () => {
      const results = await piq
        .from<TestSearch, TestMeta>("tasks")
        .search("*")
        .filter({ category: "docs" })
        .exec();

      expect(results).toHaveLength(2);
    });

    test("combines search and filter", async () => {
      const results = await piq
        .from<TestSearch, TestMeta>("tasks")
        .search({ status: "todo" })
        .filter({ category: "docs" })
        .exec();

      expect(results).toHaveLength(1);
      expect(results[0].search.name).toBe("task-1");
    });

    test("throws when collection has no metaResolver", async () => {
      clearCollections();
      registerCollections({
        simple: defineCollection({
          searchSchema: mockSchema<TestSearch>(),
          searchResolver: createMockSearchResolver(),
        }),
      });

      expect(() => piq.from("simple").search("*").filter({ category: "docs" })).toThrow(
        "Cannot use filter() without a metaResolver"
      );
    });
  });

  describe("select", () => {
    test("selects specific search fields", async () => {
      const results = await piq
        .from<TestSearch>("tasks")
        .search("*")
        .select({ search: ["name"] })
        .exec();

      expect(results[0].search).toEqual({ name: "task-1" });
    });

    test("selects meta fields", async () => {
      const results = await piq
        .from<TestSearch, TestMeta>("tasks")
        .search({ status: "todo", name: "task-1" })
        .select({ meta: ["title"] })
        .exec();

      expect(results[0].meta).toEqual({ title: "Task 1" });
    });

    test("selects body fields", async () => {
      const results = await piq
        .from<TestSearch, TestMeta, TestBody>("tasks")
        .search({ status: "todo", name: "task-1" })
        .select({ body: ["html"] })
        .exec();

      expect(results[0].body).toEqual({ html: "<p>Task 1 content</p>" });
    });

    test("selects from multiple layers", async () => {
      const results = await piq
        .from<TestSearch, TestMeta, TestBody>("tasks")
        .search({ name: "task-1" })
        .select({
          search: ["name"],
          meta: ["title", "category"],
          body: ["html"],
        })
        .exec();

      expect(results[0]).toEqual({
        path: "/work/todo/task-1.md",
        search: { name: "task-1" },
        meta: { title: "Task 1", category: "docs" },
        body: { html: "<p>Task 1 content</p>" },
      });
    });
  });

  describe("single", () => {
    test("returns single result when exactly one match", async () => {
      const result = await piq
        .from<TestSearch>("tasks")
        .search({ name: "task-1" })
        .single()
        .exec();

      expect(result.search.name).toBe("task-1");
    });

    test("throws when no results", async () => {
      await expect(
        piq
          .from<TestSearch>("tasks")
          .search({ name: "nonexistent" })
          .single()
          .exec()
      ).rejects.toThrow("No results found");
    });

    test("throws when multiple results", async () => {
      await expect(
        piq.from<TestSearch>("tasks").search({ status: "todo" }).single().exec()
      ).rejects.toThrow("Expected single result, got 2");
    });
  });
});

describe("piq.from", () => {
  beforeEach(() => {
    clearCollections();
  });

  test("throws for unknown collection", () => {
    expect(() => piq.from("unknown")).toThrow('Collection "unknown" not found');
  });

  test("returns QueryBuilder for known collection", () => {
    registerCollections({
      tasks: defineCollection({
        searchSchema: mockSchema<TestSearch>(),
        searchResolver: createMockSearchResolver(),
      }),
    });

    const builder = piq.from("tasks");
    expect(builder).toBeInstanceOf(QueryBuilder);
  });
});
