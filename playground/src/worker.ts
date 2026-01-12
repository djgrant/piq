/**
 * Example Cloudflare Worker using piq with static content
 *
 * This demonstrates how to use piq in edge environments where
 * filesystem access is not available.
 *
 * Build process:
 * 1. Run `bun run scripts/build-content.ts` to compile content
 * 2. Bundle this worker with your bundler (wrangler, esbuild, etc.)
 * 3. Deploy to Cloudflare Workers
 */

import { posts, workPackages, type Post, type WorkPackage } from "./generated/content";
import { staticContent } from "@piqit/resolvers/edge";
import { fromResolver } from "piqit";

// =============================================================================
// Create Static Resolvers
// =============================================================================

// Create resolvers from pre-compiled content
const postsResolver = staticContent<Post>(posts);
const workPackagesResolver = staticContent<WorkPackage>(workPackages);

// Create query builders (no need to register - use fromResolver directly)
const postsQuery = () => fromResolver(postsResolver);
const workPackagesQuery = () => fromResolver(workPackagesResolver);

// =============================================================================
// Worker Handler
// =============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // GET /posts - List all posts
    if (url.pathname === "/posts") {
      const results = await postsQuery()
        .select("params.year", "params.slug", "frontmatter.title", "frontmatter.author")
        .exec();

      return Response.json(results);
    }

    // GET /posts/2024 - List posts from 2024
    if (url.pathname === "/posts/2024") {
      const results = await postsQuery()
        .scan({ year: "2024" })
        .select("params.slug", "frontmatter.title", "frontmatter.tags")
        .exec();

      return Response.json(results);
    }

    // GET /posts/by-author?author=John - Filter by author
    if (url.pathname === "/posts/by-author") {
      const author = url.searchParams.get("author");
      if (!author) {
        return Response.json({ error: "Missing author parameter" }, { status: 400 });
      }

      const results = await postsQuery()
        .filter({ author })
        .select("params.year", "params.slug", "frontmatter.title")
        .exec();

      return Response.json(results);
    }

    // GET /work-packages - List all work packages
    if (url.pathname === "/work-packages") {
      const results = await workPackagesQuery()
        .select("params.status", "params.name", "frontmatter.category", "frontmatter.size")
        .exec();

      return Response.json(results);
    }

    // GET /work-packages/todo - List todo items
    if (url.pathname === "/work-packages/todo") {
      const results = await workPackagesQuery()
        .scan({ status: "todo" })
        .select("params.priority", "params.name", "frontmatter.size", "body.html")
        .exec();

      return Response.json(results);
    }

    // Default: Show available endpoints
    return Response.json({
      message: "piq Static Content API",
      endpoints: [
        "GET /posts - List all posts",
        "GET /posts/2024 - List posts from 2024",
        "GET /posts/by-author?author=John - Filter by author",
        "GET /work-packages - List all work packages",
        "GET /work-packages/todo - List todo items",
      ],
    });
  },
};
