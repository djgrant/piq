import { describe, test, expect } from "bun:test"
import path from "node:path"

const CLI_PATH = path.join(import.meta.dir, "../src/cli.ts")
const PROJECT_DIR = path.join(import.meta.dir, "fixtures/project")

async function runCli(
  args: string[],
  cwd: string = PROJECT_DIR
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", CLI_PATH, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

describe("piq CLI", () => {
  test("lists collections when run without arguments", async () => {
    const { stdout, exitCode } = await runCli([])
    expect(exitCode).toBe(0)
    expect(stdout).toContain("notes")
    expect(stdout).toContain("scan:   year, slug")
  })

  test("--schema shows scan, filter, and select fields", async () => {
    const { stdout, exitCode } = await runCli(["notes", "--schema"])
    expect(exitCode).toBe(0)
    expect(stdout).toContain("scan:   year, slug")
    expect(stdout).toContain("filter: title, status, priority")
    expect(stdout).toContain("frontmatter.title")
  })

  test("queries with scan, filter, and select as JSON lines", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--scan", "year=2024",
      "--filter", "status=published",
      "--select", "params.slug,frontmatter.title",
    ])
    expect(exitCode).toBe(0)
    const rows = stdout.trim().split("\n").map((line) => JSON.parse(line))
    expect(rows).toEqual([{ slug: "first-note", title: "First Note" }])
  })

  test("filter values are coerced to JSON primitives", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--filter", "priority=3",
      "--select", "params.slug",
    ])
    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim())).toEqual({ slug: "third-note" })
  })

  test("sorts and limits results", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--sort", "frontmatter.priority:desc",
      "--limit", "2",
      "--select", "params.slug",
    ])
    expect(exitCode).toBe(0)
    const rows = stdout.trim().split("\n").map((line) => JSON.parse(line))
    expect(rows).toEqual([{ slug: "third-note" }, { slug: "first-note" }])
  })

  test("--table renders aligned columns", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--sort", "params.slug",
      "--select", "params.slug,frontmatter.status",
      "--table",
    ])
    expect(exitCode).toBe(0)
    const lines = stdout.trimEnd().split("\n")
    expect(lines[0]).toMatch(/^slug\s+status$/)
    expect(lines.length).toBe(5) // header + separator + 3 rows
  })

  test("finds config from a nested working directory", async () => {
    const { stdout, exitCode } = await runCli(
      ["notes", "--select", "params.slug"],
      path.join(PROJECT_DIR, "content/2024")
    )
    expect(exitCode).toBe(0)
    expect(stdout.trim().split("\n").length).toBe(3)
  })

  test("errors on unknown collection with available names", async () => {
    const { stderr, exitCode } = await runCli(["nope", "--select", "params.slug"])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("Unknown collection 'nope'")
    expect(stderr).toContain("notes")
  })

  test("errors when --select is missing, pointing at --schema", async () => {
    const { stderr, exitCode } = await runCli(["notes"])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("--select is required")
    expect(stderr).toContain("piq notes --schema")
  })
})

describe("contains filter", () => {
  test("--filter k~=v substring-matches", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--filter", "title~=Note",
      "--select", "params.slug",
    ])
    expect(exitCode).toBe(0)
    expect(stdout.trim().split("\n").length).toBe(3)
  })

  test("zero rows is a clean empty result, no stderr noise", async () => {
    const { stdout, stderr, exitCode } = await runCli([
      "notes",
      "--filter", "title=Note",
      "--select", "params.slug",
    ])
    expect(exitCode).toBe(0)
    expect(stdout.trim()).toBe("")
    expect(stderr.trim()).toBe("")
  })
})

describe("raw output", () => {
  test("--raw prints one plain value per line", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--sort", "params.slug",
      "--select", "file.path",
      "--raw",
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe(
      "content/2024/first-note.md\ncontent/2024/second-note.md\ncontent/2025/third-note.md\n"
    )
  })

  test("--raw0 separates values with NUL and emits no newline", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--scan", "year=2025",
      "--select", "file.path",
      "--raw0",
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe("content/2025/third-note.md\0")
  })

  test("--raw renders non-string primitives", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--filter", "priority=3",
      "--select", "frontmatter.priority",
      "--raw",
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe("3\n")
  })

  test("null prints as an empty value", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--scan", "year=2025",
      "--select", "frontmatter.summary",
      "--raw",
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe("\n")
  })

  test("--raw rejects an array value, pointing at --json", async () => {
    const { stderr, exitCode } = await runCli([
      "notes",
      "--scan", "year=2025",
      "--select", "frontmatter.tags",
      "--raw",
    ])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("got an array")
    expect(stderr).toContain("--json")
  })

  test("--raw rejects more than one --select path", async () => {
    const { stderr, exitCode } = await runCli([
      "notes",
      "--select", "params.slug,file.path",
      "--raw",
    ])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("--raw expects exactly one --select path")
  })

  test("--raw rejects a wildcard that expands to several values", async () => {
    const { stderr, exitCode } = await runCli(["notes", "--select", "params.*", "--raw"])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("--raw expects one value per row")
  })

  test("output modes cannot be combined", async () => {
    const { stderr, exitCode } = await runCli([
      "notes",
      "--select", "file.path",
      "--raw",
      "--json",
    ])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("mutually exclusive")
  })

  test("zero rows print nothing", async () => {
    const { stdout, stderr, exitCode } = await runCli([
      "notes",
      "--filter", "title=Note",
      "--select", "file.path",
      "--raw",
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe("")
    expect(stderr.trim()).toBe("")
  })
})

describe("path validation and file.path", () => {
  test("selecting file.path returns the source file path", async () => {
    const { stdout, exitCode } = await runCli([
      "notes",
      "--scan", "year=2025",
      "--select", "params.slug,file.path",
    ])
    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout.trim())).toEqual({
      slug: "third-note",
      path: "content/2025/third-note.md",
    })
  })

  test("unknown select path errors with the valid paths", async () => {
    const { stderr, exitCode } = await runCli(["notes", "--select", "path"])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("Unknown select path 'path'")
    expect(stderr).toContain("file.path")
  })

  test("unknown sort path errors", async () => {
    const { stderr, exitCode } = await runCli([
      "notes",
      "--sort", "frontmatter.updated:desc",
      "--select", "params.slug",
    ])
    expect(exitCode).toBe(1)
    expect(stderr).toContain("Unknown sort path 'frontmatter.updated'")
  })

  test("namespace wildcards remain valid", async () => {
    const { exitCode } = await runCli(["notes", "--select", "params.*"])
    expect(exitCode).toBe(0)
  })
})
