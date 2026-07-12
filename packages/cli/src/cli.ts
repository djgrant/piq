#!/usr/bin/env bun
/**
 * piq CLI
 *
 * Query document collections declared in piq.config.ts from the command
 * line. Output is JSON lines by default so results compose with other
 * tools and stay cheap to consume.
 */

import { from, type QueryBuilder } from "piqit"
import { findConfig, loadConfig, type AnyResolver, type PiqConfig } from "./config.js"
import { parseArgs } from "node:util"
import path from "node:path"

const USAGE = `Usage:
  piq                                    List collections
  piq <collection> --schema              Show queryable fields
  piq <collection> [options]             Run a query

Query options:
  --scan k=v        Constrain path params (repeatable, cheapest stage)
  --filter k=v      Equality-match loaded fields (repeatable)
  --filter k~=v     Substring-match string fields (case-sensitive)
  --select a,b,c    Dot-paths to return (required for queries)
  --sort path[:desc]  Sort by dot-path (repeatable, asc default)
  --limit n         Cap result count (applied after sort)

Output options:
  --json            JSON array instead of JSON lines
  --table           Aligned table for humans

Other:
  --config <path>   Explicit config file (default: nearest piq.config.ts)
  --help            Show this help
`

class CliError extends Error {}

function parsePair(input: string, flag: string): [string, string] {
  const eq = input.indexOf("=")
  if (eq === -1) {
    throw new CliError(`--${flag} expects key=value, got: ${input}`)
  }
  return [input.slice(0, eq), input.slice(eq + 1)]
}

/** Coerce CLI strings to JSON primitives where unambiguous */
function coerceValue(raw: string): unknown {
  if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(raw)) return JSON.parse(raw)
  return raw
}

function describeCollection(name: string, resolver: AnyResolver): string {
  const meta = resolver.meta
  if (!meta) return `${name}\n  (no schema metadata exposed by this resolver)`
  const lines = [name]
  if (meta.scanKeys?.length) lines.push(`  scan:   ${meta.scanKeys.join(", ")}`)
  if (meta.filterKeys?.length) lines.push(`  filter: ${meta.filterKeys.join(", ")}`)
  if (meta.selectPaths?.length) lines.push(`  select: ${meta.selectPaths.join(", ")}`)
  return lines.join("\n")
}

function renderTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "(no results)"
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const cell = (value: unknown): string =>
    value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value)
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => cell(r[col]).length))
  )
  const line = (values: string[]) =>
    values.map((v, i) => v.padEnd(widths[i])).join("  ").trimEnd()
  return [
    line(columns),
    line(widths.map((w) => "-".repeat(w))),
    ...rows.map((r) => line(columns.map((col) => cell(r[col])))),
  ].join("\n")
}

export async function run(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scan: { type: "string", multiple: true },
      filter: { type: "string", multiple: true },
      select: { type: "string" },
      sort: { type: "string", multiple: true },
      limit: { type: "string" },
      json: { type: "boolean" },
      table: { type: "boolean" },
      schema: { type: "boolean" },
      config: { type: "string" },
      help: { type: "boolean" },
    },
  })

  if (values.help) {
    console.log(USAGE)
    return 0
  }

  const configPath = values.config
    ? path.resolve(values.config)
    : findConfig(process.cwd())
  if (!configPath) {
    throw new CliError(
      "No piq.config.ts found in this directory or any parent. Create one exporting defineConfig({ collections: { ... } })."
    )
  }

  // Resolvers with relative base paths resolve against cwd, so anchor
  // execution at the config's directory
  process.chdir(path.dirname(configPath))
  const config: PiqConfig = await loadConfig(configPath)
  const collectionNames = Object.keys(config.collections)

  if (positionals.length === 0) {
    console.log(`Collections in ${configPath}:\n`)
    for (const name of collectionNames) {
      console.log(describeCollection(name, config.collections[name]))
    }
    return 0
  }

  const collectionName = positionals[0]
  const resolver = config.collections[collectionName]
  if (!resolver) {
    throw new CliError(
      `Unknown collection '${collectionName}'. Available: ${collectionNames.join(", ")}`
    )
  }

  if (values.schema) {
    console.log(describeCollection(collectionName, resolver))
    return 0
  }

  if (!values.select) {
    throw new CliError(
      `--select is required. Run 'piq ${collectionName} --schema' to see selectable paths.`
    )
  }

  let query = from(resolver) as QueryBuilder<AnyResolver, Record<string, unknown>>

  for (const pair of values.scan ?? []) {
    const [key, value] = parsePair(pair, "scan")
    query = query.scan({ [key]: value })
  }
  for (const pair of values.filter ?? []) {
    const [key, value] = parsePair(pair, "filter")
    if (key.endsWith("~")) {
      query = query.filter({ [key.slice(0, -1)]: { contains: value } })
    } else {
      query = query.filter({ [key]: coerceValue(value) })
    }
  }
  for (const sortSpec of values.sort ?? []) {
    const [sortPath, direction = "asc"] = sortSpec.split(":")
    if (direction !== "asc" && direction !== "desc") {
      throw new CliError(`--sort direction must be asc or desc, got: ${sortSpec}`)
    }
    query = query.sort(sortPath as never, direction)
  }
  if (values.limit !== undefined) {
    const limit = Number(values.limit)
    if (!Number.isInteger(limit) || limit < 0) {
      throw new CliError(`--limit must be a non-negative integer, got: ${values.limit}`)
    }
    query = query.limit(limit)
  }

  const selectPaths = values.select.split(",").map((s) => s.trim()).filter(Boolean)
  const rows = await (query.select(...(selectPaths as never[])) as QueryBuilder<
    AnyResolver,
    Record<string, unknown>
  >).exec()

  if (rows.length === 0 && (values.scan?.length || values.filter?.length)) {
    console.error(
      "0 rows. --scan and --filter match values exactly; for substring matching use --filter 'key~=value'."
    )
  }

  if (values.table) {
    console.log(renderTable(rows))
  } else if (values.json) {
    console.log(JSON.stringify(rows, null, 2))
  } else {
    for (const row of rows) {
      console.log(JSON.stringify(row))
    }
  }
  return 0
}

if (import.meta.main) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof CliError ? error.message : error)
      process.exit(1)
    })
}
