# Contributing to llm-wiki-mcp

## Prerequisites

- Node.js >= 20
- npm

## Dev Setup

```bash
git clone https://github.com/sumitroajiprabowo/llm-wiki-mcp.git
cd llm-wiki-mcp
npm install
npm run build
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Type Checking

```bash
npm run lint
```

This runs `tsc --noEmit` and reports any type errors without emitting output files.

## Project Structure

```
src/
  config/        Schema loading and configuration types
  core/          Core wiki logic: index management, link resolution, logging, and the main wiki manager
  search/        Search provider abstraction and implementations (simple, QMD, auto-detect)
  tools/         MCP tool handlers (one file per tool) and the tool registry (index.ts)
  server.ts      MCP server entry point
  cli.ts         CLI entry point

tests/
  config/        Tests for config loading and validation
  core/          Tests for core wiki operations
  search/        Tests for search providers
  tools/         Tests for individual tool handlers
  fixtures/      Shared test fixtures and sample wiki content
```

## Adding a New Tool

1. Create a handler file in `src/tools/`, for example `src/tools/my-tool.ts`. Export a handler function and its input schema.

2. Register the tool in `src/tools/index.ts` by importing your handler and adding it to the tool registry.

3. Add a corresponding test file in `tests/tools/my-tool.test.ts`. Cover at least the happy path and one error case.

4. Run `npm run lint && npm test` to verify everything passes before opening a PR.

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature or tool |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Build, dependencies, tooling |
| `ci:` | CI/CD pipeline changes |

Examples:

```
feat: add export-page tool
fix: resolve broken links when page title contains spaces
docs: add CONTRIBUTING.md
chore: upgrade vitest to v3
```

## PR Process

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes and ensure `npm run lint && npm test` pass locally.
3. Push your branch and open a pull request against `main`.
4. Describe what the PR does and reference any related issues.
5. A maintainer will review and merge once approved.
