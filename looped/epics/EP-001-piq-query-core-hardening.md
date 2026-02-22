---
title: Piq Query Core Hardening
created: "2026-02-22"
updated: "2026-02-22"
owner: human
status: active
---
Piq is reset around one goal: query behavior must be stable, diagnosable, and fast on common paths.

Success criteria:
- Resolver/query contracts are explicit and versioned.
- Failures are actionable from diagnostics.
- Hot paths show measurable benchmark improvement.

Execution plan:
1. Version and lock resolver/query output contracts.
2. Add structured diagnostics for parse/resolve failures.
3. Optimize repeated query hot paths and benchmark results.
4. Expand edge-case regression coverage.

Seed tasks (medium scope):
- Define versioned query output schema and validators.
- Add structured error payloads for parser/resolver failures.
- Optimize repeated resolver lookups with benchmark harness.
- Add regression tests for parser and resolver edge cases.
- Publish consumer troubleshooting notes.
