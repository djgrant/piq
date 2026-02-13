---
title: Resolver Types
description: Core type contracts used by piq and resolvers
---

# Resolver Types

## `StandardSchema`

`piq` uses the [Standard Schema](https://github.com/standard-schema/standard-schema) protocol as the schema boundary.

```typescript
interface StandardSchema<T = unknown> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) =>
      | { value: T; issues?: undefined }
      | { value?: undefined; issues: readonly StandardSchemaIssue[] }
  }
}
```

## `Resolver<TScanSchema, TFilterSchema, TResultSchema>`

```typescript
interface Resolver<
  TScanSchema extends StandardSchema,
  TFilterSchema extends StandardSchema,
  TResultSchema extends StandardSchema
> {
  schema: {
    scanParams: TScanSchema
    filterParams: TFilterSchema
    result: TResultSchema
  }

  resolve(
    spec: QuerySpec<
      Infer<TScanSchema>,
      Infer<TFilterSchema>,
      SelectablePaths<Infer<TResultSchema>>
    >
  ): Promise<Partial<Infer<TResultSchema>>[]>
}
```

### Key Point

`resolve()` returns namespaced partial rows. `piq` flattens those rows after resolve according to `select()`.

## `QuerySpec<TScan, TFilter, TSelect>`

```typescript
interface QuerySpec<TScan, TFilter, TSelect extends string> {
  scan?: Partial<TScan>
  filter?: Partial<TFilter>
  select: TSelect[]
}
```

## Select Type Utilities

`piqit` exports type helpers for select typing:

- `SelectablePaths<T>`
- `GetFieldName<S>`
- `GetPathValue<T, S>`
- `ExpandWildcard<T, S>`
- `HasCollision<Paths>`
- `Undot<T, Paths>`
- `UndotWithAliases<T, Aliases>`

These power compile-time validation and result inference.
