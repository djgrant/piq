---
title: "@piqit/cli"
description: The piq command-line interface
---

# `@piqit/cli`

`@piqit/cli` provides the `piq` binary and the config helpers it loads collections from. See the [CLI manual](../manual/cli.md) for usage.

Requires the Bun runtime (`engines.bun`).

## Install

```bash
npm install @piqit/cli
```

## Exports

```typescript
import { defineConfig, findConfig, loadConfig } from '@piqit/cli'
import type { PiqConfig, AnyResolver } from '@piqit/cli'
```

- `defineConfig(config)` – identity helper that types a `piq.config.ts`.
- `findConfig(startDir)` – walks up from a directory to the nearest `piq.config.ts` or `piq.config.js`; returns `null` if none exists.
- `loadConfig(path)` – imports a config file and validates that it default-exports a `collections` object.

## Binary

`piq` reads the nearest config, resolves relative resolver paths against the config's directory, and executes one query per invocation. Run `piq --help` for the flag reference.

## Build/Check (Workspace)

```bash
pok packages cli build
pok packages cli check
```
