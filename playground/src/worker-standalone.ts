/**
 * Standalone Edge Worker - Zero Dependencies
 * 
 * This is a self-contained query implementation for CF Workers/Pages
 * that doesn't import any external packages.
 */

import { posts, workPackages, type Post, type WorkPackage } from "./generated/content";

// =============================================================================
// Minimal Query Implementation (inline, no imports)
// =============================================================================

type AnyRecord = Record<string, unknown>;

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as AnyRecord)[part];
  }
  return current;
}

function matchesFilter(item: AnyRecord, namespace: string, filter: AnyRecord): boolean {
  const data = item[namespace] as AnyRecord | undefined;
  if (!data) return Object.keys(filter).length === 0;
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && data[key] !== value) return false;
  }
  return true;
}

function selectFields(item: AnyRecord, paths: string[]): AnyRecord {
  const result: AnyRecord = {};
  for (const path of paths) {
    const parts = path.split(".");
    const ns = parts[0];
    if (!result[ns]) result[ns] = {};
    if (parts.length === 2) {
      (result[ns] as AnyRecord)[parts[1]] = getByPath(item, path);
    }
  }
  return result;
}

function flattenResult(item: AnyRecord): AnyRecord {
  const flat: AnyRecord = {};
  for (const ns of Object.values(item)) {
    if (ns && typeof ns === "object") {
      Object.assign(flat, ns);
    }
  }
  return flat;
}

interface QueryOptions {
  scan?: AnyRecord;
  filter?: AnyRecord;
  select: string[];
}

function query<T extends object>(data: T[], options: QueryOptions): AnyRecord[] {
  let results = [...data] as AnyRecord[];

  // Apply scan (filter by params)
  if (options.scan && Object.keys(options.scan).length > 0) {
    results = results.filter(item => matchesFilter(item, "params", options.scan!));
  }

  // Apply filter (filter by frontmatter)
  if (options.filter && Object.keys(options.filter).length > 0) {
    results = results.filter(item => matchesFilter(item, "frontmatter", options.filter!));
  }

  // Select and flatten
  return results
    .map(item => selectFields(item, options.select))
    .map(flattenResult);
}

// =============================================================================
// Worker Handler
// =============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET /posts - List all posts
    if (url.pathname === "/posts") {
      const results = query(posts, {
        select: ["params.year", "params.slug", "frontmatter.title", "frontmatter.author"],
      });
      return Response.json(results);
    }

    // GET /posts/2024 - List posts from 2024
    if (url.pathname === "/posts/2024") {
      const results = query(posts, {
        scan: { year: "2024" },
        select: ["params.slug", "frontmatter.title", "frontmatter.tags"],
      });
      return Response.json(results);
    }

    // GET /posts/by-author - Filter by author
    if (url.pathname === "/posts/by-author") {
      const author = url.searchParams.get("author");
      if (!author) {
        return Response.json({ error: "Missing author parameter" }, { status: 400 });
      }
      const results = query(posts, {
        filter: { author },
        select: ["params.year", "params.slug", "frontmatter.title"],
      });
      return Response.json(results);
    }

    // GET /work-packages - List all work packages  
    if (url.pathname === "/work-packages") {
      const results = query(workPackages, {
        select: ["params.status", "params.name", "frontmatter.category", "frontmatter.size"],
      });
      return Response.json(results);
    }

    // GET /work-packages/todo - List todo items
    if (url.pathname === "/work-packages/todo") {
      const results = query(workPackages, {
        scan: { status: "todo" },
        select: ["params.priority", "params.name", "frontmatter.size"],
      });
      return Response.json(results);
    }

    // Default
    return Response.json({
      message: "piq Static Content API (standalone)",
      endpoints: [
        "GET /posts",
        "GET /posts/2024", 
        "GET /posts/by-author?author=John",
        "GET /work-packages",
        "GET /work-packages/todo",
      ],
    });
  },
};
