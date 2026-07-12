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
