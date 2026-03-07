---
title: piq QueryBuilder throws when exec() called without select()
created: "2026-03-06T17:36:03.075Z"
updated: "2026-03-07T10:59:41.491Z"
priority: low
assignee: agent
tags: [dx, api]
---
In `piq/packages/piqit/src/query.ts` line 217, `getSelectPaths()` throws `'No select specified. Use .select() to specify fields to retrieve.'` when neither `_selectPaths` nor `_selectAliases` are set. 

This means `piq.from(resolver).exec()` always throws, which is surprising for a query builder — users would expect to get all fields by default. The `stream()` method also inherits this behavior since it calls `exec()`.

Options: either return all fields by default (would need resolver to declare available fields), or improve the error message to be thrown at build time (when calling exec()) rather than in an internal method.