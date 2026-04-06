# wiki-mcp Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Origin:** Andrej Karpathy's LLM Wiki pattern ([gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f))

## Overview

An open-source MCP (Model Context Protocol) server that implements Karpathy's LLM Wiki pattern — enabling any MCP-compatible LLM client (Claude Desktop, Claude Code, etc.) to build and maintain a persistent, compounding knowledge base as structured markdown files.

The server provides tools for wiki CRUD, search, ingestion, and maintenance. The LLM does the reasoning (summarizing, cross-referencing, synthesizing). The server handles file I/O, search, validation, and bookkeeping.

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Target user | Open source / community — universal, configurable, domain-agnostic |
| 2 | Search strategy | qmd optional — fallback to simple text search if qmd not installed |
| 3 | Transport | stdio (default) + SSE (optional, for remote/team use) |
| 4 | Obsidian compatibility | Configurable: wikilink `[[Page]]` or standard markdown `[Page](path.md)` |
| 5 | Scope v1 | Minimal viable — 8 tools |
| 6 | Schema | Single config file `.wiki-schema.yaml` |
| 7 | Distribution | npm: `npx wiki-mcp` or `npm install -g wiki-mcp` |

## Architecture: Modular by Layer

```
wiki-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE (MIT)
├── bin/
│   └── wiki-mcp.ts              ← CLI entrypoint: parse args, pick transport
├── src/
│   ├── index.ts                  ← server factory: create & configure MCP server
│   ├── transport/
│   │   ├── stdio.ts              ← stdio transport setup
│   │   └── sse.ts                ← SSE/HTTP transport setup
│   ├── tools/
│   │   ├── index.ts              ← register all tools to server
│   │   ├── init.ts
│   │   ├── ingest.ts
│   │   ├── lint.ts
│   │   ├── create-page.ts
│   │   ├── read-page.ts
│   │   ├── update-page.ts
│   │   ├── delete-page.ts
│   │   └── search.ts
│   ├── core/
│   │   ├── wiki-manager.ts       ← CRUD operations on wiki pages
│   │   ├── index-manager.ts      ← index.md management
│   │   ├── log-manager.ts        ← log.md management (append-only)
│   │   └── link-resolver.ts      ← wikilink / markdown link generation & parsing
│   ├── search/
│   │   ├── search-provider.ts    ← SearchProvider interface
│   │   ├── qmd-provider.ts       ← qmd CLI wrapper
│   │   └── simple-provider.ts    ← fallback: built-in text search
│   └── config/
│       ├── schema-loader.ts      ← load & validate .wiki-schema.yaml
│       └── types.ts              ← TypeScript types for config, pages, tools
├── tests/
│   ├── tools/
│   ├── core/
│   └── search/
└── examples/
    ├── vault-research/
    │   ├── .wiki-schema.yaml
    │   ├── raw/
    │   ├── wiki/
    │   ├── index.md
    │   └── log.md
    └── vault-personal/
```

## Vault Structure

When a user inits or connects a vault:

```
my-vault/
├── .wiki-schema.yaml       ← config & conventions
├── raw/                    ← immutable source documents
│   └── assets/             ← images, attachments
├── wiki/                   ← LLM-generated pages
├── index.md                ← catalog of all wiki pages
└── log.md                  ← chronological record
```

## Config Schema (`.wiki-schema.yaml`)

```yaml
name: "My Research Wiki"
version: 1

# Link format
linkStyle: "wikilink"   # "wikilink" | "markdown"

# Directories
paths:
  raw: "raw"
  wiki: "wiki"
  assets: "raw/assets"

# Page types & frontmatter conventions
pageTypes:
  source:
    description: "Summary of a raw source document"
    requiredFields: [title, type, source_path, created]
  concept:
    description: "A concept or idea"
    requiredFields: [title, type, tags, created]
  entity:
    description: "A person, organization, or thing"
    requiredFields: [title, type, tags, created]
  comparison:
    description: "Comparison between concepts/entities"
    requiredFields: [title, type, subjects, created]

# Tagging
tags:
  required: false
  suggested: []

# Log format
log:
  prefix: "## [{date}] {operation} | {title}"
```

All fields have sensible defaults. Config file is optional — server works without it.

## Tools (8 total)

### Tool 1: `wiki_init`

Initialize a new vault with folder structure and default config.

```typescript
input:  { path: string, name?: string, linkStyle?: "wikilink" | "markdown" }
output: { success: boolean, message: string, created: string[] }
```

- Creates: `raw/`, `raw/assets/`, `wiki/`, `.wiki-schema.yaml`, `index.md`, `log.md`
- If vault already exists, skip without overwrite

### Tool 2: `wiki_ingest`

Read a raw source and return its content + context for LLM processing.

```typescript
input:  { source_path: string }   // relative to vault root, e.g. "raw/paper.md"
output: {
  content: string,
  existing_pages: string[],
  schema: object
}
```

- `source_path` is relative to vault root (e.g. `raw/my-article.md`)
- Server reads the source file and scans existing wiki pages
- LLM uses the returned data to create/update wiki pages via other tools
- Server does NOT generate wiki content

### Tool 3: `wiki_create_page`

Create a new wiki page.

```typescript
input:  {
  title: string,
  content: string,        // markdown with frontmatter
  pageType?: string       // "source" | "concept" | "entity" | "comparison"
}
output: { success: boolean, path: string, message: string }
```

- Auto-generates filename via slugify
- Validates frontmatter against schema
- Appends to index.md and log.md

### Tool 4: `wiki_read_page`

Read a wiki page by title or path.

```typescript
input:  { title?: string, path?: string }
output: { content: string, frontmatter: object, path: string }
```

### Tool 5: `wiki_update_page`

Update an existing wiki page.

```typescript
input:  { path: string, content: string }
output: { success: boolean, path: string, message: string }
```

- Overwrites content, updates `updated` field in frontmatter
- Appends to log.md

### Tool 6: `wiki_delete_page`

Delete a wiki page.

```typescript
input:  { path: string }
output: { success: boolean, message: string, broken_links: string[] }
```

- Deletes file, removes from index.md
- Returns pages with broken links to this page
- Appends to log.md

### Tool 7: `wiki_search`

Search across wiki pages.

```typescript
input:  { query: string, max_results?: number }
output: { results: Array<{ path: string, title: string, snippet: string, score: number }> }
```

- Auto-detects: qmd available → QmdProvider, otherwise → SimpleProvider

### Tool 8: `wiki_lint`

Health-check the wiki.

```typescript
input:  { scope?: "full" | "recent" }
output: {
  orphan_pages: string[],
  broken_links: string[],
  missing_pages: string[],
  pages_without_frontmatter: string[],
  stale_index_entries: string[]
}
```

## Search Abstraction

```typescript
interface SearchProvider {
  name: string;
  available(): Promise<boolean>;
  index(wikiDir: string): Promise<void>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

interface SearchOptions {
  maxResults: number;     // default: 10
  wikiDir: string;
}

interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;          // 0-1
}
```

**QmdProvider:** wraps `qmd` CLI — `which qmd` to check availability, `qmd search --json` for queries.

**SimpleProvider:** always available, reads all `.md` files, substring/regex match, rank by match count + position.

**Selection:** auto-detect at server start, no config needed.

## Link Resolver

```typescript
interface LinkResolver {
  createLink(targetTitle: string, displayText?: string): string;
  parseLinks(content: string): ParsedLink[];
  resolveLink(link: string, fromPage: string): string | null;
}
```

**Wikilink mode:** `[[Page]]`, `[[Display|Page]]`
**Markdown mode:** `[Page](wiki/page.md)`, `[Display](wiki/page.md)`

**Shared utilities:**
- `slugify(title)` — title to filename: `"Transformer Architecture"` → `"transformer-architecture"`
- `getAllLinks(wikiDir)` — adjacency list for link graph
- `getBacklinks(page, wikiDir)` — all pages linking to a given page

## Index Manager

`index.md` organized by page type categories:

```markdown
# Wiki Index

## Sources
- [[Attention Is All You Need]] — Vaswani et al. 2017, transformer paper

## Concepts
- [[Attention Mechanism]] — Core mechanism for focusing on relevant input

## Entities
- [[Ashish Vaswani]] — First author of the Transformer paper
```

Operations: `read()`, `addEntry()`, `removeEntry()`, `rebuild()`.

## Log Manager

`log.md` — append-only, parseable prefix format:

```markdown
# Wiki Log

## [2026-04-06] init | My Research Wiki
Vault initialized.

## [2026-04-06] ingest | Attention Is All You Need
Source processed. Created: attention-is-all-you-need.md. Updated: index.md.
```

Operations: `append()`, `read(filter?)`.

Prefix format compatible with unix tools: `grep "^## \[" log.md | tail -5`.

## CLI & Transport

```bash
# stdio (default)
wiki-mcp --vault ~/my-wiki

# SSE
wiki-mcp --vault ~/my-wiki --transport sse --port 3000

# Init shortcut
wiki-mcp init ~/my-wiki
```

Flags: `--vault` (default: cwd), `--transport` (default: stdio), `--port` (default: 3000).

Claude Desktop config:
```json
{
  "mcpServers": {
    "wiki": {
      "command": "npx",
      "args": ["wiki-mcp", "--vault", "/path/to/my-vault"]
    }
  }
}
```

## Dependencies

### Runtime (4 packages)

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server SDK, transports |
| `js-yaml` | Parse `.wiki-schema.yaml` |
| `gray-matter` | Parse YAML frontmatter from markdown |
| `glob` | File pattern matching for wiki page scanning |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | Compiler |
| `vitest` | Test runner |
| `tsup` | Bundler (CJS + ESM) |
| `@types/node` | Node.js types |

### Deliberate exclusions

- No `commander`/`yargs` — `parseArgs` built-in (Node 18+)
- No `express`/`fastify` — MCP SDK handles HTTP for SSE
- No `fuse.js` — SimpleProvider uses substring match for v1
- No `slugify` package — < 10 lines, custom implementation

### Node.js minimum: 18 (parseArgs, stable ESM, LTS)

### Build output

```
dist/
├── index.js        ← ESM, library entrypoint
├── index.d.ts      ← type declarations
└── cli.js          ← CLI entrypoint
```
