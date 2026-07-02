---
name: no-relative-module-specifiers
description: Use this skill when changing TypeScript, JavaScript, or Vue imports and exports, handling alias work, addressing PR review comments about ./ or ../../ paths, or changing module boundaries in this repo.
---

# No Relative Module Specifiers

This repo does not allow module specifiers starting with `./` or `../` in TypeScript, JavaScript, or Vue code. Use repo aliases instead.

## Forbidden

- Static imports: `import { x } from './x'`
- Type imports: `import type { X } from '../x'`
- Re-exports: `export * from './x'`, `export { x } from '../x'`
- Dynamic imports: `await import('./x')`
- CommonJS requires: `require('../x')`

## Allowed

These are filesystem paths, not module specifiers for this rule:

- `package.json` export maps such as `"./feature": "./src/feature.ts"`
- `tsconfig` `extends`, `references`, `include`, and `compilerOptions.paths`
- Wrangler, Vite, Turbo, shell, and other config paths
- CSS directives such as `@source "../node_modules/..."`
- Runtime path/URL construction unless the user explicitly asks to remove every relative string path

## Workflow

1. Before adding or rewriting imports, inspect existing aliases in `infra/src/workspace/aliases.ts`, the relevant package `tsconfig.json`, and `tsconfig.e2e.json` for tests.
2. Prefer existing aliases such as `@infra/*`, `@ui/*`, `#ui/*`, `@db/*`, `@contracts/*`, `@tests/*`, `@mail/*`, `@mcp/*`, `@annotator/*`, `@web/*`, and `@demo/*`.
3. If a package needs an internal alias, add it to TypeScript config and shared Vite/Vitest alias config before rewriting imports.
4. Run `node .agents/skills/no-relative-module-specifiers/scripts/check-relative-module-specifiers.mjs` after import changes.
5. For CI-backed enforcement, keep `tests/infra/unit/workspace/no-relative-module-specifiers.test.ts` passing.

Do not solve this by disabling the checker or narrowing its tracked-file scan.
