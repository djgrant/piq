---
status: proposed
created_at: 2026-07-31
---

# RFC 0001: Raw output for `piq`

## Problem

piq has three output modes: JSON lines, `--json`, and `--table`. All three are structured. None of them prints a value by itself.

Tools like grep and xargs expect plain values, one per line. To pass piq results to them, you have to unpack the JSON with jq:

```bash
piq posts --scan year=2024 --select file.path | jq -r .path | xargs grep -l "TODO"
```

## Proposal: `--raw`

`--raw` prints each value as plain text, one per line:

```
$ piq posts --scan year=2024 --select file.path --raw
content/posts/2024/hello-world.md
content/posts/2024/tables-in-markdown.md
```

This allows output to be piped directly into other tools, instead of relying on jq:

```bash
piq posts --scan year=2024 --select file.path --raw | xargs grep -l "TODO"
```

## Proposal: `--print0`

`--print0` is `--raw` with a different separator: a NUL byte (byte value 0) after each value instead of a newline.

It exists because file paths can contain newlines and spaces, which breaks line-based piping. Unix forbids only the NUL byte in file names, so NUL always separates paths safely. xargs reads this format with `-0`:

```bash
piq posts --scan year=2024 --select file.path --print0 | xargs -0 grep -l "TODO"
```

The same pattern exists in `find -print0`, `grep -Z`, `sort -z`, `fd -0`, and `rg -0`.

## Rules

Both flags follow the same rules:

1. `--select` must contain exactly one path, such as `file.path`. Raw output has no field names, so two values in one row could not be told apart.
2. The value must be a string, a number, or a boolean. An object or array is an error; use JSON output for those.
3. `null` prints as an empty value.
4. `--raw`, `--print0`, `--json`, and `--table` cannot be combined.
