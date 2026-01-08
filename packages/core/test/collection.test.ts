import { describe, test, expect, beforeEach } from "bun:test";
import {
  defineCollection,
  registerCollections,
  getCollection,
  clearCollections,
  getCollectionNames,
} from "../src/collection";
import type { SearchResolver, StandardSchema } from "../src/types";

// Mock schema that conforms to Standard Schema interface
function mockSchema<T>(): StandardSchema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => ({ value: value as T }),
    },
  };
}

// Mock search resolver
function mockSearchResolver<T>(): SearchResolver<T> {
  return {
    async search() {
      return [];
    },
  };
}

describe("defineCollection", () => {
  test("returns the collection definition unchanged", () => {
    const definition = {
      searchSchema: mockSchema<{ slug: string }>(),
      searchResolver: mockSearchResolver<{ slug: string }>(),
    };

    const result = defineCollection(definition);

    expect(result).toBe(definition);
  });

  test("accepts full three-layer definition", () => {
    const definition = {
      searchSchema: mockSchema<{ slug: string }>(),
      searchResolver: mockSearchResolver<{ slug: string }>(),
      metaSchema: mockSchema<{ title: string }>(),
      metaResolver: {
        async resolve() {
          return { title: "test" };
        },
      },
      bodySchema: mockSchema<{ html: string }>(),
      bodyResolver: {
        async resolve() {
          return { html: "<p>test</p>" };
        },
      },
    };

    const result = defineCollection(definition);

    expect(result).toEqual(definition);
  });
});

describe("registry", () => {
  beforeEach(() => {
    clearCollections();
  });

  test("registers and retrieves collections", () => {
    const posts = defineCollection({
      searchSchema: mockSchema<{ slug: string }>(),
      searchResolver: mockSearchResolver<{ slug: string }>(),
    });

    registerCollections({ posts });

    const retrieved = getCollection("posts");
    expect(retrieved).toBe(posts);
  });

  test("throws for unknown collection", () => {
    expect(() => getCollection("unknown")).toThrow(
      'Collection "unknown" not found'
    );
  });

  test("lists registered collection names", () => {
    registerCollections({
      posts: defineCollection({
        searchSchema: mockSchema<{ slug: string }>(),
        searchResolver: mockSearchResolver<{ slug: string }>(),
      }),
      pages: defineCollection({
        searchSchema: mockSchema<{ path: string }>(),
        searchResolver: mockSearchResolver<{ path: string }>(),
      }),
    });

    const names = getCollectionNames();
    expect(names).toContain("posts");
    expect(names).toContain("pages");
    expect(names).toHaveLength(2);
  });

  test("clearCollections removes all collections", () => {
    registerCollections({
      posts: defineCollection({
        searchSchema: mockSchema<{ slug: string }>(),
        searchResolver: mockSearchResolver<{ slug: string }>(),
      }),
    });

    expect(getCollectionNames()).toHaveLength(1);

    clearCollections();

    expect(getCollectionNames()).toHaveLength(0);
  });

  test("multiple registerCollections calls merge collections", () => {
    registerCollections({
      posts: defineCollection({
        searchSchema: mockSchema<{ slug: string }>(),
        searchResolver: mockSearchResolver<{ slug: string }>(),
      }),
    });

    registerCollections({
      pages: defineCollection({
        searchSchema: mockSchema<{ path: string }>(),
        searchResolver: mockSearchResolver<{ path: string }>(),
      }),
    });

    expect(getCollectionNames()).toContain("posts");
    expect(getCollectionNames()).toContain("pages");
  });
});
