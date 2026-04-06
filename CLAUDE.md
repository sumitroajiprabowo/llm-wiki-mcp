# CLAUDE.md — wiki-mcp

## Project overview

wiki-mcp is a Model Context Protocol (MCP) server that exposes a structured knowledge wiki as a set of LLM tools. It lets an LLM agent create, read, update, delete, search, and lint Markdown pages stored in a local vault directory. The vault layout is Obsidian-compatible: pages live under `wiki/`, raw source documents under `raw/`, and a `.wiki-schema.yaml` file controls naming conventions, page types, link style, and log format. The server can run over stdio (default) or HTTP/SSE, and ships a `wiki-mcp` CLI binary for init and server startup.

## Commands

```
npm run build      # compile TypeScript to dist/ via tsup
npm run dev        # watch mode (tsup --watch)
npm test           # run all tests once with vitest
npm run lint       # type-check only (tsc --noEmit), no emitted files
```

## Architecture

The source is split into four layers under `src/`:

```
src/
  config/          # schema loading and type definitions
  core/            # business logic classes
  search/          # search provider abstraction and implementations
  tools/           # thin MCP tool handlers
  server.ts        # server factory (createServer)
  cli.ts           # CLI entry point
```

**config/** — `schema-loader.ts` reads `.wiki-schema.yaml` from the vault root and merges it with `DEFAULT_SCHEMA` from `types.ts`. All type definitions (`WikiSchema`, `IndexEntry`, `LogEntry`, `SearchResult`, etc.) live in `types.ts`.

**core/** — four classes that handle all business logic:
- `WikiManager` — CRUD for wiki pages; calls IndexManager and LogManager on every write
- `IndexManager` — maintains `wiki-index.json` (title, path, pageType, summary for each page)
- `LogManager` — appends structured entries to a Markdown log file inside the vault
- `LinkResolver` — slugifies titles, creates links in the configured style, and parses links out of page content

**search/** — `SearchProvider` interface with two implementations selected at startup by `detect.ts`:
- `SimpleProvider` — pure-JS full-text grep over the wiki directory (always available, fallback)
- `QmdProvider` — optional semantic search backend; used when `qmd` binary is available on PATH

**tools/** — one file per MCP tool (`create-page.ts`, `read-page.ts`, etc.). Each exports a single `handleXxx` function that accepts plain input and a core module instance. `tools/index.ts` holds `registerTools`, which wires every handler to the MCP server with a Zod input schema.

**server.ts** — `createServer(config)` constructs all core objects (loadSchema → LinkResolver → LogManager → IndexManager → WikiManager → detectSearchProvider), then calls `registerTools`.

**cli.ts** — parses `--vault`, `--transport`, `--port` flags; handles the `init` positional subcommand; connects the server to a stdio or HTTP transport.

## Key patterns

- **Tools are thin handlers.** Each file in `src/tools/` does minimal work: validate input, call the appropriate core method, return the result. No file I/O or business logic belongs in tools.
- **Core modules own all state.** WikiManager, IndexManager, LogManager, and LinkResolver are the only classes that read or write the vault.
- **SearchProvider is a runtime-detected interface.** `detectSearchProvider()` tries QmdProvider first; if unavailable it falls back to SimpleProvider. New providers must implement `name`, `available()`, `index()`, and `search()`.
- **Schema drives configuration.** `loadSchema` merges user YAML with `DEFAULT_SCHEMA`; downstream code reads from the schema object rather than hardcoding paths or page type names.
- **Link style is a first-class setting.** `LinkResolver` is constructed with `schema.linkStyle` and all link creation/parsing goes through it. `"wikilink"` produces `[[Page]]`; `"markdown"` produces `[Page](wiki/page.md)`.

## Testing

Tests use **vitest** and mirror the `src/` directory layout under `tests/`:

```
tests/
  config/
  core/
  search/
  tools/
  fixtures/        # temp files created and deleted per test
```

Each test file that touches the filesystem creates a temp directory under `tests/fixtures/` in `beforeEach` and removes it with `rmSync(..., { recursive: true, force: true })` in `afterEach`. Tests import source files directly (not `dist/`).

Run a single test file:
```
npx vitest run tests/core/wiki-manager.test.ts
```

## Adding a tool

1. Create `src/tools/my-tool.ts` with an exported `handleMyTool(input, ...services)` function.
2. Add the handler to `src/tools/index.ts`:
   - Import the handler at the top.
   - Call `server.registerTool("wiki_my_tool", { title, description, inputSchema: z.object({...}) }, handler)` inside `registerTools`.
3. Add a test in `tests/tools/my-tool.test.ts`.

## Do not

- Do not modify files under `raw/` — these are source documents ingested by the LLM, not managed by code.
- Do not add npm dependencies without a clear reason; the dependency list is intentionally small.
- Do not break Obsidian compatibility: keep `wiki/` as a flat directory of `.md` files with YAML frontmatter, and preserve wikilink syntax when `linkStyle` is `"wikilink"`.
- Do not put business logic in `src/tools/` — keep handlers thin and push logic into core modules.
