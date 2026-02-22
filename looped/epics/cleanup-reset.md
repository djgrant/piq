---
title: Cleanup Reset
created: "2026-02-22"
updated: "2026-02-22"
owner: human
status: active
---
## At a Glance
Reset `piq` as a dependable query core with clearer contracts, diagnosable failures, and measurable performance.

## Problem
Query/parser ambiguity and weak diagnostics increase debugging time across every consumer.

## Outcome
- Resolver and query outputs are explicit and stable.
- Failures are actionable without source spelunking.
- Hot query paths improve with measurable benchmarks.

## Plan
1. Lock down query/resolver contracts.
Version and validate output shapes for consumer safety.
2. Improve diagnostics.
Provide structured parser and resolver error reporting.
3. Optimize high-frequency paths.
Reduce repeated scan costs in common query patterns.
4. Expand regression coverage.
Cover parser/resolver edge cases that commonly regress.
5. Publish concise operating guidance.
Document usage and troubleshooting patterns for consumers.

## Subtasks
- Version and enforce resolver/query output contracts.
- Add structured diagnostics for parse/resolve failures.
- Optimize repeated query hot paths with benchmarks.
- Increase regression coverage for edge conditions.
- Ship concise usage and troubleshooting notes.
