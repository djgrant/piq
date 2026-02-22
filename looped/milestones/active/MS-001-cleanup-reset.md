---
title: Cleanup Reset for piq
created: "2026-02-22T11:30:17.000Z"
updated: "2026-02-22T11:30:17.000Z"
---
## Five-Second Gist
Refine piq into a reliable query core with clear contracts, better diagnostics, and predictable performance.

## Why This Exists
Piq powers selection and indexing across the ecosystem. Query ambiguity or perf drift degrades every downstream workflow.

## Outcome
- Query contracts are explicit and versioned.
- Failure modes are diagnosable without source-diving.
- Common query paths are measurably faster.

## Plan
1. Stabilize schema and resolver contracts.
   Deliverables: versioned output shapes and clearer validation errors.
2. Improve observability and debugability.
   Deliverables: structured diagnostics for matcher and parser failures.
3. Target high-impact performance paths.
   Deliverables: indexed lookups for repeated query patterns and benchmark deltas.
4. Strengthen correctness coverage.
   Deliverables: regression tests for parser edge cases and resolver composition.
5. Document operational guidance.
   Deliverables: concise usage and troubleshooting notes for consumers.

## Subtasks (Right-Sized)
- Version and tighten resolver/query schema contracts.
- Add structured diagnostics for parsing and resolution failures.
- Optimize repeated query hot paths with measured benchmarks.
- Expand regression coverage for parser and resolver edge cases.
- Publish concise consumer-facing usage and troubleshooting docs.
