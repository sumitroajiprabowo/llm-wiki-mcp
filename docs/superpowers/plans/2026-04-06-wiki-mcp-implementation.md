# wiki-mcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source MCP server that implements Karpathy's LLM Wiki pattern — CRUD, search, ingestion, and maintenance for a structured markdown wiki.

**Architecture:** Modular by layer — `tools/` (8 MCP tools), `core/` (wiki-manager, index-manager, log-manager, link-resolver), `search/` (pluggable: qmd or simple), `config/` (schema loader + types). CLI entrypoint supports stdio and Streamable HTTP transports.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk` (server + node packages), `zod/v4`, `js-yaml`, `gray-matter`, `glob`, `vitest`, `tsup`

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | Package config, scripts, bin, dependencies |
| `tsconfig.json` | TypeScript compiler config |
| `tsup.config.ts` | Bundler config |
| `src/config/types.ts` | All TypeScript interfaces and types |
| `src/config/schema-loader.ts` | Load & validate `.wiki-schema.yaml`, provide defaults |
| `src/core/link-resolver.ts` | Generate/parse wikilinks or markdown links |
| `src/core/log-manager.ts` | Append/read `log.md` |
| `src/core/index-manager.ts` | CRUD on `index.md` |
| `src/core/wiki-manager.ts` | CRUD on wiki pages (delegates to index/log/link) |
| `src/search/search-provider.ts` | `SearchProvider` interface |
| `src/search/simple-provider.ts` | Built-in text search fallback |
| `src/search/qmd-provider.ts` | qmd CLI wrapper (uses execFile for safety) |
| `src/search/detect.ts` | Auto-detect which provider to use |
| `src/tools/init.ts` | `wiki_init` tool |
| `src/tools/create-page.ts` | `wiki_create_page` tool |
| `src/tools/read-page.ts` | `wiki_read_page` tool |
| `src/tools/update-page.ts` | `wiki_update_page` tool |
| `src/tools/delete-page.ts` | `wiki_delete_page` tool |
| `src/tools/ingest.ts` | `wiki_ingest` tool |
| `src/tools/search.ts` | `wiki_search` tool |
| `src/tools/lint.ts` | `wiki_lint` tool |
| `src/tools/index.ts` | Register all tools to McpServer |
| `src/server.ts` | Server factory: create & configure McpServer |
| `src/cli.ts` | CLI entrypoint: parse args, pick transport, start |
| `tests/config/schema-loader.test.ts` | Tests for schema loader |
| `tests/core/link-resolver.test.ts` | Tests for link resolver |
| `tests/core/log-manager.test.ts` | Tests for log manager |
| `tests/core/index-manager.test.ts` | Tests for index manager |
| `tests/core/wiki-manager.test.ts` | Tests for wiki manager |
| `tests/search/simple-provider.test.ts` | Tests for simple search |
| `tests/tools/init.test.ts` | Tests for wiki_init |
| `tests/tools/crud.test.ts` | Tests for create/read/update/delete |
| `tests/tools/ingest.test.ts` | Tests for wiki_ingest |
| `tests/tools/search.test.ts` | Tests for wiki_search |
| `tests/tools/lint.test.ts` | Tests for wiki_lint |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `src/config/types.ts`

- [ ] **Step 1: Initialize git repo**

```bash
cd ~/Projects/wiki-mcp
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "wiki-mcp",
  "version": "0.1.0",
  "description": "MCP server for building and maintaining LLM-powered knowledge wikis",
  "type": "module",
  "main": "dist/server.js",
  "types": "dist/server.d.ts",
  "bin": {
    "wiki-mcp": "dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "keywords": ["mcp", "wiki", "llm", "knowledge-base", "obsidian"],
  "license": "MIT",
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd ~/Projects/wiki-mcp
npm install @modelcontextprotocol/server @modelcontextprotocol/node zod js-yaml gray-matter glob
npm install -D typescript vitest tsup @types/node @types/js-yaml
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { server: "src/server.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    target: "node18",
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node18",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
```

- [ ] **Step 6: Create src/config/types.ts — all shared types**

```typescript
// src/config/types.ts

export interface WikiSchema {
  name: string;
  version: number;
  linkStyle: "wikilink" | "markdown";
  paths: {
    raw: string;
    wiki: string;
    assets: string;
  };
  pageTypes: Record<string, PageTypeConfig>;
  tags: {
    required: boolean;
    suggested: string[];
  };
  log: {
    prefix: string;
  };
}

export interface PageTypeConfig {
  description: string;
  requiredFields: string[];
}

export interface IndexEntry {
  title: string;
  path: string;
  pageType: string;
  summary: string;
}

export interface LogEntry {
  date: string;
  operation: string;
  title: string;
  details?: string;
}

export interface LogFilter {
  operation?: string;
  since?: string;
  limit?: number;
}

export interface ParsedLink {
  raw: string;
  target: string;
  displayText?: string;
}

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  maxResults: number;
  wikiDir: string;
}

export interface PageData {
  content: string;
  frontmatter: Record<string, unknown>;
  path: string;
}

export const DEFAULT_SCHEMA: WikiSchema = {
  name: "My Wiki",
  version: 1,
  linkStyle: "wikilink",
  paths: {
    raw: "raw",
    wiki: "wiki",
    assets: "raw/assets",
  },
  pageTypes: {
    source: {
      description: "Summary of a raw source document",
      requiredFields: ["title", "type", "source_path", "created"],
    },
    concept: {
      description: "A concept or idea",
      requiredFields: ["title", "type", "tags", "created"],
    },
    entity: {
      description: "A person, organization, or thing",
      requiredFields: ["title", "type", "tags", "created"],
    },
    comparison: {
      description: "Comparison between concepts/entities",
      requiredFields: ["title", "type", "subjects", "created"],
    },
  },
  tags: {
    required: false,
    suggested: [],
  },
  log: {
    prefix: "## [{date}] {operation} | {title}",
  },
};
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 8: Verify build compiles**

Run: `cd ~/Projects/wiki-mcp && npx tsc --noEmit`
Expected: No errors (just the types file, nothing to compile yet but should parse clean)

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts src/config/types.ts .gitignore package-lock.json
git commit -m "feat: project scaffold with types and build config"
```

---

### Task 2: Schema Loader

**Files:**
- Create: `src/config/schema-loader.ts`
- Create: `tests/config/schema-loader.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/config/schema-loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSchema } from "../../src/config/schema-loader.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/schema-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("loadSchema", () => {
  it("returns defaults when no config file exists", () => {
    const schema = loadSchema(TEST_DIR);
    expect(schema).toEqual(DEFAULT_SCHEMA);
  });

  it("loads and merges .wiki-schema.yaml with defaults", () => {
    const yaml = `
name: "Research Wiki"
linkStyle: "markdown"
paths:
  raw: "sources"
`;
    writeFileSync(join(TEST_DIR, ".wiki-schema.yaml"), yaml);
    const schema = loadSchema(TEST_DIR);
    expect(schema.name).toBe("Research Wiki");
    expect(schema.linkStyle).toBe("markdown");
    expect(schema.paths.raw).toBe("sources");
    expect(schema.paths.wiki).toBe("wiki"); // default preserved
    expect(schema.pageTypes).toEqual(DEFAULT_SCHEMA.pageTypes); // defaults preserved
  });

  it("throws on invalid linkStyle", () => {
    writeFileSync(
      join(TEST_DIR, ".wiki-schema.yaml"),
      'linkStyle: "invalid"'
    );
    expect(() => loadSchema(TEST_DIR)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/config/schema-loader.test.ts`
Expected: FAIL — `Cannot find module '../../src/config/schema-loader.js'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/config/schema-loader.ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { DEFAULT_SCHEMA, type WikiSchema } from "./types.js";

export function loadSchema(vaultPath: string): WikiSchema {
  const configPath = join(vaultPath, ".wiki-schema.yaml");

  if (!existsSync(configPath)) {
    return { ...DEFAULT_SCHEMA };
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw) as Partial<WikiSchema>;

  if (
    parsed.linkStyle &&
    parsed.linkStyle !== "wikilink" &&
    parsed.linkStyle !== "markdown"
  ) {
    throw new Error(
      `Invalid linkStyle: "${parsed.linkStyle}". Must be "wikilink" or "markdown".`
    );
  }

  return {
    name: parsed.name ?? DEFAULT_SCHEMA.name,
    version: parsed.version ?? DEFAULT_SCHEMA.version,
    linkStyle: parsed.linkStyle ?? DEFAULT_SCHEMA.linkStyle,
    paths: {
      ...DEFAULT_SCHEMA.paths,
      ...parsed.paths,
    },
    pageTypes: parsed.pageTypes ?? DEFAULT_SCHEMA.pageTypes,
    tags: {
      ...DEFAULT_SCHEMA.tags,
      ...parsed.tags,
    },
    log: {
      ...DEFAULT_SCHEMA.log,
      ...parsed.log,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/config/schema-loader.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/schema-loader.ts tests/config/schema-loader.test.ts
git commit -m "feat: schema loader with yaml parsing and defaults"
```

---

### Task 3: Link Resolver

**Files:**
- Create: `src/core/link-resolver.ts`
- Create: `tests/core/link-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/core/link-resolver.test.ts
import { describe, it, expect } from "vitest";
import { LinkResolver } from "../../src/core/link-resolver.js";

describe("LinkResolver — wikilink mode", () => {
  const resolver = new LinkResolver("wikilink", "wiki");

  it("creates a simple wikilink", () => {
    expect(resolver.createLink("Transformer Architecture")).toBe(
      "[[Transformer Architecture]]"
    );
  });

  it("creates a wikilink with display text", () => {
    expect(
      resolver.createLink("Attention Is All You Need", "Vaswani et al")
    ).toBe("[[Attention Is All You Need|Vaswani et al]]");
  });

  it("parses wikilinks from content", () => {
    const content =
      "See [[Transformer Architecture]] and [[Attention Is All You Need|Vaswani et al]].";
    const links = resolver.parseLinks(content);
    expect(links).toEqual([
      { raw: "[[Transformer Architecture]]", target: "Transformer Architecture", displayText: undefined },
      {
        raw: "[[Attention Is All You Need|Vaswani et al]]",
        target: "Attention Is All You Need",
        displayText: "Vaswani et al",
      },
    ]);
  });
});

describe("LinkResolver — markdown mode", () => {
  const resolver = new LinkResolver("markdown", "wiki");

  it("creates a markdown link", () => {
    expect(resolver.createLink("Transformer Architecture")).toBe(
      "[Transformer Architecture](wiki/transformer-architecture.md)"
    );
  });

  it("creates a markdown link with display text", () => {
    expect(
      resolver.createLink("Attention Is All You Need", "Vaswani et al")
    ).toBe(
      "[Vaswani et al](wiki/attention-is-all-you-need.md)"
    );
  });

  it("parses markdown links from content", () => {
    const content =
      "See [Transformer Architecture](wiki/transformer-architecture.md) and [Vaswani et al](wiki/attention-is-all-you-need.md).";
    const links = resolver.parseLinks(content);
    expect(links).toEqual([
      {
        raw: "[Transformer Architecture](wiki/transformer-architecture.md)",
        target: "Transformer Architecture",
        displayText: undefined,
      },
      {
        raw: "[Vaswani et al](wiki/attention-is-all-you-need.md)",
        target: "Vaswani et al",
        displayText: undefined,
      },
    ]);
  });
});

describe("slugify", () => {
  it("converts title to slug", () => {
    const resolver = new LinkResolver("markdown", "wiki");
    expect(resolver.slugify("Transformer Architecture")).toBe(
      "transformer-architecture"
    );
    expect(resolver.slugify("Vaswani et al. (2017)")).toBe(
      "vaswani-et-al-2017"
    );
    expect(resolver.slugify("  Hello   World  ")).toBe("hello-world");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/link-resolver.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write implementation**

```typescript
// src/core/link-resolver.ts
import type { ParsedLink } from "../config/types.js";

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const MDLINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

export class LinkResolver {
  constructor(
    private linkStyle: "wikilink" | "markdown",
    private wikiDir: string
  ) {}

  slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  createLink(targetTitle: string, displayText?: string): string {
    if (this.linkStyle === "wikilink") {
      if (displayText) {
        return `[[${targetTitle}|${displayText}]]`;
      }
      return `[[${targetTitle}]]`;
    }

    const slug = this.slugify(targetTitle);
    const path = `${this.wikiDir}/${slug}.md`;
    const text = displayText ?? targetTitle;
    return `[${text}](${path})`;
  }

  parseLinks(content: string): ParsedLink[] {
    const links: ParsedLink[] = [];

    if (this.linkStyle === "wikilink") {
      let match: RegExpExecArray | null;
      const regex = new RegExp(WIKILINK_REGEX.source, "g");
      while ((match = regex.exec(content)) !== null) {
        links.push({
          raw: match[0],
          target: match[1],
          displayText: match[2] ?? undefined,
        });
      }
    } else {
      let match: RegExpExecArray | null;
      const regex = new RegExp(MDLINK_REGEX.source, "g");
      while ((match = regex.exec(content)) !== null) {
        links.push({
          raw: match[0],
          target: match[1],
          displayText: undefined,
        });
      }
    }

    return links;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/link-resolver.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/link-resolver.ts tests/core/link-resolver.test.ts
git commit -m "feat: link resolver with wikilink and markdown modes"
```

---

### Task 4: Log Manager

**Files:**
- Create: `src/core/log-manager.ts`
- Create: `tests/core/log-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/core/log-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LogManager } from "../../src/core/log-manager.js";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/log-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("LogManager", () => {
  it("creates log.md and appends an entry", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({
      date: "2026-04-06",
      operation: "init",
      title: "My Wiki",
      details: "Vault initialized.",
    });

    const content = readFileSync(join(TEST_DIR, "log.md"), "utf-8");
    expect(content).toContain("# Wiki Log");
    expect(content).toContain("## [2026-04-06] init | My Wiki");
    expect(content).toContain("Vault initialized.");
  });

  it("appends multiple entries in order", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({
      date: "2026-04-06",
      operation: "init",
      title: "My Wiki",
    });
    await manager.append({
      date: "2026-04-06",
      operation: "create",
      title: "Test Page",
      details: "New page created.",
    });

    const content = readFileSync(join(TEST_DIR, "log.md"), "utf-8");
    const initPos = content.indexOf("init | My Wiki");
    const createPos = content.indexOf("create | Test Page");
    expect(initPos).toBeLessThan(createPos);
  });

  it("reads entries with filter", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({ date: "2026-04-05", operation: "init", title: "Wiki" });
    await manager.append({ date: "2026-04-06", operation: "create", title: "Page A" });
    await manager.append({ date: "2026-04-06", operation: "ingest", title: "Source B" });

    const all = await manager.read();
    expect(all).toHaveLength(3);

    const creates = await manager.read({ operation: "create" });
    expect(creates).toHaveLength(1);
    expect(creates[0].title).toBe("Page A");

    const recent = await manager.read({ since: "2026-04-06" });
    expect(recent).toHaveLength(2);

    const limited = await manager.read({ limit: 1 });
    expect(limited).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/log-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/core/log-manager.ts
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { LogEntry, LogFilter } from "../config/types.js";

const LOG_HEADER = "# Wiki Log\n";
const ENTRY_REGEX = /^## \[(\d{4}-\d{2}-\d{2})\] (\w+) \| (.+)$/;

export class LogManager {
  private logPath: string;

  constructor(vaultPath: string) {
    this.logPath = join(vaultPath, "log.md");
  }

  async append(entry: LogEntry): Promise<void> {
    if (!existsSync(this.logPath)) {
      writeFileSync(this.logPath, LOG_HEADER + "\n", "utf-8");
    }

    let block = `\n## [${entry.date}] ${entry.operation} | ${entry.title}\n`;
    if (entry.details) {
      block += `${entry.details}\n`;
    }

    appendFileSync(this.logPath, block, "utf-8");
  }

  async read(filter?: LogFilter): Promise<LogEntry[]> {
    if (!existsSync(this.logPath)) {
      return [];
    }

    const content = readFileSync(this.logPath, "utf-8");
    const lines = content.split("\n");
    const entries: LogEntry[] = [];
    let current: LogEntry | null = null;
    const detailLines: string[] = [];

    const flushCurrent = () => {
      if (current) {
        if (detailLines.length > 0) {
          current.details = detailLines.join("\n").trim() || undefined;
        }
        entries.push(current);
        detailLines.length = 0;
      }
    };

    for (const line of lines) {
      const match = line.match(ENTRY_REGEX);
      if (match) {
        flushCurrent();
        current = {
          date: match[1],
          operation: match[2],
          title: match[3],
        };
      } else if (current && line.trim() !== "" && !line.startsWith("# ")) {
        detailLines.push(line);
      }
    }
    flushCurrent();

    let result = entries;

    if (filter?.operation) {
      result = result.filter((e) => e.operation === filter.operation);
    }
    if (filter?.since) {
      result = result.filter((e) => e.date >= filter.since!);
    }
    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/log-manager.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/log-manager.ts tests/core/log-manager.test.ts
git commit -m "feat: log manager with append-only log.md and filtered reads"
```

---

### Task 5: Index Manager

**Files:**
- Create: `src/core/index-manager.ts`
- Create: `tests/core/index-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/core/index-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IndexManager } from "../../src/core/index-manager.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/index-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("IndexManager", () => {
  const linkResolver = new LinkResolver("wikilink", "wiki");

  it("creates index.md and adds an entry", async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: "Attention Mechanism",
      path: "wiki/attention-mechanism.md",
      pageType: "concept",
      summary: "Core mechanism for focusing on relevant input",
    });

    const content = readFileSync(join(TEST_DIR, "index.md"), "utf-8");
    expect(content).toContain("# Wiki Index");
    expect(content).toContain("## Concepts");
    expect(content).toContain("[[Attention Mechanism]]");
    expect(content).toContain("Core mechanism for focusing on relevant input");
  });

  it("groups entries by page type", async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: "Attention",
      path: "wiki/attention.md",
      pageType: "concept",
      summary: "A concept",
    });
    await manager.addEntry({
      title: "Vaswani",
      path: "wiki/vaswani.md",
      pageType: "entity",
      summary: "A researcher",
    });

    const content = readFileSync(join(TEST_DIR, "index.md"), "utf-8");
    const conceptsPos = content.indexOf("## Concepts");
    const entitiesPos = content.indexOf("## Entities");
    expect(conceptsPos).toBeGreaterThan(-1);
    expect(entitiesPos).toBeGreaterThan(-1);
  });

  it("removes an entry by path", async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: "To Remove",
      path: "wiki/to-remove.md",
      pageType: "concept",
      summary: "Will be removed",
    });
    await manager.removeEntry("wiki/to-remove.md");

    const content = readFileSync(join(TEST_DIR, "index.md"), "utf-8");
    expect(content).not.toContain("To Remove");
  });

  it("reads all entries", async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: "Page A",
      path: "wiki/page-a.md",
      pageType: "source",
      summary: "Summary A",
    });
    await manager.addEntry({
      title: "Page B",
      path: "wiki/page-b.md",
      pageType: "concept",
      summary: "Summary B",
    });

    const entries = await manager.read();
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe("Page A");
    expect(entries[1].title).toBe("Page B");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/index-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/core/index-manager.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IndexEntry } from "../config/types.js";
import type { LinkResolver } from "./link-resolver.js";

const INDEX_HEADER = "# Wiki Index\n";

const CATEGORY_MAP: Record<string, string> = {
  source: "Sources",
  concept: "Concepts",
  entity: "Entities",
  comparison: "Comparisons",
};

interface StoredIndex {
  entries: IndexEntry[];
}

export class IndexManager {
  private indexPath: string;

  constructor(
    vaultPath: string,
    private linkResolver: LinkResolver
  ) {
    this.indexPath = join(vaultPath, "index.md");
  }

  async addEntry(entry: IndexEntry): Promise<void> {
    const stored = this.load();
    stored.entries.push(entry);
    this.save(stored);
  }

  async removeEntry(path: string): Promise<void> {
    const stored = this.load();
    stored.entries = stored.entries.filter((e) => e.path !== path);
    this.save(stored);
  }

  async read(): Promise<IndexEntry[]> {
    return this.load().entries;
  }

  async rebuild(entries: IndexEntry[]): Promise<void> {
    this.save({ entries });
  }

  private load(): StoredIndex {
    if (!existsSync(this.indexPath)) {
      return { entries: [] };
    }

    const content = readFileSync(this.indexPath, "utf-8");
    const entries: IndexEntry[] = [];

    const lineRegex = /^- .+? — (.+)$/;
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/;
    const mdlinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

    let currentType = "";
    const categoryToType: Record<string, string> = {};
    for (const [type, category] of Object.entries(CATEGORY_MAP)) {
      categoryToType[category] = type;
    }

    for (const line of content.split("\n")) {
      if (line.startsWith("## ")) {
        const category = line.slice(3).trim();
        currentType = categoryToType[category] ?? "other";
        continue;
      }

      if (!line.startsWith("- ")) continue;

      const summaryMatch = line.match(lineRegex);
      const summary = summaryMatch?.[1] ?? "";

      const wikiMatch = line.match(wikilinkRegex);
      const mdMatch = line.match(mdlinkRegex);

      if (wikiMatch) {
        entries.push({
          title: wikiMatch[1],
          path: "",
          pageType: currentType,
          summary,
        });
      } else if (mdMatch) {
        entries.push({
          title: mdMatch[1],
          path: mdMatch[2],
          pageType: currentType,
          summary,
        });
      }
    }

    return { entries };
  }

  private save(stored: StoredIndex): void {
    const grouped: Record<string, IndexEntry[]> = {};

    for (const entry of stored.entries) {
      const category = CATEGORY_MAP[entry.pageType] ?? "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(entry);
    }

    let content = INDEX_HEADER;

    const orderedCategories = [
      "Sources",
      "Concepts",
      "Entities",
      "Comparisons",
      "Other",
    ];

    for (const category of orderedCategories) {
      const entries = grouped[category];
      if (!entries || entries.length === 0) continue;

      content += `\n## ${category}\n\n`;
      for (const entry of entries) {
        const link = this.linkResolver.createLink(entry.title);
        content += `- ${link} — ${entry.summary}\n`;
      }
    }

    writeFileSync(this.indexPath, content, "utf-8");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/index-manager.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/index-manager.ts tests/core/index-manager.test.ts
git commit -m "feat: index manager with categorized page catalog"
```

---

### Task 6: Wiki Manager

**Files:**
- Create: `src/core/wiki-manager.ts`
- Create: `tests/core/wiki-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/core/wiki-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WikiManager } from "../../src/core/wiki-manager.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { IndexManager } from "../../src/core/index-manager.js";
import { LogManager } from "../../src/core/log-manager.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/wiki-test");

beforeEach(() => {
  mkdirSync(join(TEST_DIR, "wiki"), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function createManager() {
  const linkResolver = new LinkResolver("wikilink", "wiki");
  const indexManager = new IndexManager(TEST_DIR, linkResolver);
  const logManager = new LogManager(TEST_DIR);
  return new WikiManager(TEST_DIR, DEFAULT_SCHEMA, linkResolver, indexManager, logManager);
}

describe("WikiManager", () => {
  it("creates a page with frontmatter", async () => {
    const manager = createManager();
    const content = `---
title: Attention Mechanism
type: concept
tags: [deep-learning]
created: 2026-04-06
---

# Attention Mechanism

A core mechanism in transformers.`;

    const result = await manager.createPage("Attention Mechanism", content, "concept");
    expect(result.success).toBe(true);
    expect(result.path).toBe("wiki/attention-mechanism.md");

    const filePath = join(TEST_DIR, "wiki/attention-mechanism.md");
    expect(existsSync(filePath)).toBe(true);

    const saved = readFileSync(filePath, "utf-8");
    expect(saved).toContain("# Attention Mechanism");
  });

  it("reads a page by path", async () => {
    const manager = createManager();
    const content = `---
title: Test Page
type: concept
tags: []
created: 2026-04-06
---

# Test Page

Content here.`;

    await manager.createPage("Test Page", content, "concept");
    const page = await manager.readPage({ path: "wiki/test-page.md" });
    expect(page.frontmatter.title).toBe("Test Page");
    expect(page.content).toContain("Content here.");
  });

  it("reads a page by title", async () => {
    const manager = createManager();
    const content = `---
title: Find Me
type: entity
tags: []
created: 2026-04-06
---

Found!`;

    await manager.createPage("Find Me", content, "entity");
    const page = await manager.readPage({ title: "Find Me" });
    expect(page.content).toContain("Found!");
  });

  it("updates a page", async () => {
    const manager = createManager();
    const original = `---
title: Mutable
type: concept
tags: []
created: 2026-04-06
---

Version 1.`;

    await manager.createPage("Mutable", original, "concept");

    const updated = `---
title: Mutable
type: concept
tags: [updated]
created: 2026-04-06
updated: 2026-04-06
---

Version 2.`;

    const result = await manager.updatePage("wiki/mutable.md", updated);
    expect(result.success).toBe(true);

    const page = await manager.readPage({ path: "wiki/mutable.md" });
    expect(page.content).toContain("Version 2.");
  });

  it("deletes a page and reports broken links", async () => {
    const manager = createManager();

    const pageA = `---
title: Page A
type: concept
tags: []
created: 2026-04-06
---

Links to [[Page B]].`;

    const pageB = `---
title: Page B
type: concept
tags: []
created: 2026-04-06
---

Standalone page.`;

    await manager.createPage("Page A", pageA, "concept");
    await manager.createPage("Page B", pageB, "concept");

    const result = await manager.deletePage("wiki/page-b.md");
    expect(result.success).toBe(true);
    expect(result.brokenLinks).toContain("wiki/page-a.md");
    expect(existsSync(join(TEST_DIR, "wiki/page-b.md"))).toBe(false);
  });

  it("rejects duplicate page creation", async () => {
    const manager = createManager();
    const content = `---
title: Dup
type: concept
tags: []
created: 2026-04-06
---

Content.`;

    await manager.createPage("Dup", content, "concept");
    const result = await manager.createPage("Dup", content, "concept");
    expect(result.success).toBe(false);
    expect(result.message).toContain("already exists");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/wiki-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/core/wiki-manager.ts
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { WikiSchema, PageData } from "../config/types.js";
import type { LinkResolver } from "./link-resolver.js";
import type { IndexManager } from "./index-manager.js";
import type { LogManager } from "./log-manager.js";

export class WikiManager {
  private wikiAbsDir: string;

  constructor(
    private vaultPath: string,
    private schema: WikiSchema,
    private linkResolver: LinkResolver,
    private indexManager: IndexManager,
    private logManager: LogManager
  ) {
    this.wikiAbsDir = join(vaultPath, schema.paths.wiki);
  }

  async createPage(
    title: string,
    content: string,
    pageType?: string
  ): Promise<{ success: boolean; path: string; message: string }> {
    const slug = this.linkResolver.slugify(title);
    const relativePath = `${this.schema.paths.wiki}/${slug}.md`;
    const absPath = join(this.vaultPath, relativePath);

    if (existsSync(absPath)) {
      return { success: false, path: relativePath, message: `Page already exists: ${relativePath}` };
    }

    writeFileSync(absPath, content, "utf-8");

    const parsed = matter(content);
    const summary = this.extractSummary(parsed.content);

    await this.indexManager.addEntry({
      title,
      path: relativePath,
      pageType: pageType ?? (parsed.data.type as string) ?? "other",
      summary,
    });

    const today = new Date().toISOString().slice(0, 10);
    await this.logManager.append({
      date: today,
      operation: "create",
      title,
      details: `Created: ${relativePath}`,
    });

    return { success: true, path: relativePath, message: `Created: ${relativePath}` };
  }

  async readPage(lookup: { title?: string; path?: string }): Promise<PageData> {
    let absPath: string;
    let relativePath: string;

    if (lookup.path) {
      relativePath = lookup.path;
      absPath = join(this.vaultPath, relativePath);
    } else if (lookup.title) {
      const slug = this.linkResolver.slugify(lookup.title);
      relativePath = `${this.schema.paths.wiki}/${slug}.md`;
      absPath = join(this.vaultPath, relativePath);
    } else {
      throw new Error("Either title or path must be provided");
    }

    if (!existsSync(absPath)) {
      throw new Error(`Page not found: ${relativePath}`);
    }

    const raw = readFileSync(absPath, "utf-8");
    const parsed = matter(raw);

    return {
      content: raw,
      frontmatter: parsed.data as Record<string, unknown>,
      path: relativePath,
    };
  }

  async updatePage(
    path: string,
    content: string
  ): Promise<{ success: boolean; path: string; message: string }> {
    const absPath = join(this.vaultPath, path);

    if (!existsSync(absPath)) {
      return { success: false, path, message: `Page not found: ${path}` };
    }

    writeFileSync(absPath, content, "utf-8");

    const parsed = matter(content);
    const title = (parsed.data.title as string) ?? path;
    const today = new Date().toISOString().slice(0, 10);

    await this.logManager.append({
      date: today,
      operation: "update",
      title,
      details: `Updated: ${path}`,
    });

    return { success: true, path, message: `Updated: ${path}` };
  }

  async deletePage(
    path: string
  ): Promise<{ success: boolean; message: string; brokenLinks: string[] }> {
    const absPath = join(this.vaultPath, path);

    if (!existsSync(absPath)) {
      return { success: false, message: `Page not found: ${path}`, brokenLinks: [] };
    }

    const raw = readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const title = (parsed.data.title as string) ?? path;

    const brokenLinks = this.findBacklinks(title);

    unlinkSync(absPath);
    await this.indexManager.removeEntry(path);

    const today = new Date().toISOString().slice(0, 10);
    await this.logManager.append({
      date: today,
      operation: "delete",
      title,
      details: `Deleted: ${path}. Broken links in: ${brokenLinks.join(", ") || "none"}`,
    });

    return { success: true, message: `Deleted: ${path}`, brokenLinks };
  }

  private findBacklinks(title: string): string[] {
    const backlinks: string[] = [];
    const files = this.listWikiFiles();

    for (const file of files) {
      const absPath = join(this.vaultPath, file);
      const content = readFileSync(absPath, "utf-8");
      const links = this.linkResolver.parseLinks(content);
      if (links.some((l) => l.target === title)) {
        backlinks.push(file);
      }
    }

    return backlinks;
  }

  listWikiFiles(): string[] {
    if (!existsSync(this.wikiAbsDir)) return [];

    return readdirSync(this.wikiAbsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `${this.schema.paths.wiki}/${f}`);
  }

  private extractSummary(content: string): string {
    const lines = content.trim().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        return trimmed.slice(0, 120);
      }
    }
    return "";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/core/wiki-manager.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/wiki-manager.ts tests/core/wiki-manager.test.ts
git commit -m "feat: wiki manager with CRUD, backlink detection, index/log integration"
```

---

### Task 7: Search — Provider Interface & Simple Provider

**Files:**
- Create: `src/search/search-provider.ts`
- Create: `src/search/simple-provider.ts`
- Create: `tests/search/simple-provider.test.ts`

- [ ] **Step 1: Write the search provider interface**

```typescript
// src/search/search-provider.ts
import type { SearchResult, SearchOptions } from "../config/types.js";

export interface SearchProvider {
  name: string;
  available(): Promise<boolean>;
  index(wikiDir: string): Promise<void>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}
```

- [ ] **Step 2: Write the failing test for SimpleProvider**

```typescript
// tests/search/simple-provider.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SimpleProvider } from "../../src/search/simple-provider.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/search-test/wiki");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });

  writeFileSync(
    join(TEST_DIR, "attention.md"),
    `---
title: Attention Mechanism
---

# Attention Mechanism

Attention allows the model to focus on relevant parts of the input sequence.
It is a key component of the Transformer architecture.`,
    "utf-8"
  );

  writeFileSync(
    join(TEST_DIR, "transformer.md"),
    `---
title: Transformer Architecture
---

# Transformer Architecture

The Transformer uses self-attention and feed-forward layers.
It was introduced in the paper "Attention Is All You Need".`,
    "utf-8"
  );

  writeFileSync(
    join(TEST_DIR, "bert.md"),
    `---
title: BERT
---

# BERT

Bidirectional Encoder Representations from Transformers.
BERT uses masked language modeling for pre-training.`,
    "utf-8"
  );
});

afterEach(() => {
  rmSync(join(TEST_DIR, ".."), { recursive: true, force: true });
});

describe("SimpleProvider", () => {
  const provider = new SimpleProvider();

  it("is always available", async () => {
    expect(await provider.available()).toBe(true);
  });

  it("searches for a term and returns ranked results", async () => {
    const results = await provider.search("attention", {
      maxResults: 10,
      wikiDir: TEST_DIR,
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].title).toBe("Attention Mechanism");
  });

  it("respects maxResults", async () => {
    const results = await provider.search("transformer", {
      maxResults: 1,
      wikiDir: TEST_DIR,
    });
    expect(results).toHaveLength(1);
  });

  it("returns empty for no matches", async () => {
    const results = await provider.search("quantum computing", {
      maxResults: 10,
      wikiDir: TEST_DIR,
    });
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/search/simple-provider.test.ts`
Expected: FAIL

- [ ] **Step 4: Write SimpleProvider implementation**

```typescript
// src/search/simple-provider.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { SearchResult, SearchOptions } from "../config/types.js";
import type { SearchProvider } from "./search-provider.js";

export class SimpleProvider implements SearchProvider {
  name = "simple";

  async available(): Promise<boolean> {
    return true;
  }

  async index(): Promise<void> {
    // no-op
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const { maxResults, wikiDir } = options;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) return [];

    const files = readdirSync(wikiDir).filter((f) => f.endsWith(".md"));
    const scored: SearchResult[] = [];

    for (const file of files) {
      const absPath = join(wikiDir, file);
      const raw = readFileSync(absPath, "utf-8");
      const parsed = matter(raw);
      const title = (parsed.data.title as string) ?? file.replace(".md", "");
      const body = parsed.content.toLowerCase();
      const titleLower = title.toLowerCase();

      let score = 0;
      let matchedSnippet = "";

      for (const term of terms) {
        if (titleLower.includes(term)) {
          score += 3;
        }

        const bodyMatches = body.split(term).length - 1;
        score += bodyMatches;

        if (!matchedSnippet && bodyMatches > 0) {
          const idx = body.indexOf(term);
          const start = Math.max(0, idx - 50);
          const end = Math.min(body.length, idx + term.length + 100);
          matchedSnippet = parsed.content.slice(start, end).trim();
        }
      }

      if (score > 0) {
        scored.push({
          path: file,
          title,
          snippet: matchedSnippet,
          score: Math.min(score / (terms.length * 5), 1),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/search/simple-provider.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/search/search-provider.ts src/search/simple-provider.ts tests/search/simple-provider.test.ts
git commit -m "feat: search provider interface and simple text search fallback"
```

---

### Task 8: Search — Qmd Provider & Auto-detect

**Files:**
- Create: `src/search/qmd-provider.ts`
- Create: `src/search/detect.ts`

- [ ] **Step 1: Write QmdProvider (using execFile for safety)**

```typescript
// src/search/qmd-provider.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SearchResult, SearchOptions } from "../config/types.js";
import type { SearchProvider } from "./search-provider.js";

const execFileAsync = promisify(execFile);

export class QmdProvider implements SearchProvider {
  name = "qmd";

  async available(): Promise<boolean> {
    try {
      await execFileAsync("which", ["qmd"]);
      return true;
    } catch {
      return false;
    }
  }

  async index(wikiDir: string): Promise<void> {
    try {
      await execFileAsync("qmd", ["index", "--dir", wikiDir]);
    } catch (err) {
      throw new Error(`qmd index failed: ${err}`);
    }
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const { maxResults, wikiDir } = options;

    try {
      const { stdout } = await execFileAsync("qmd", [
        "search",
        query,
        "--dir",
        wikiDir,
        "--limit",
        String(maxResults),
        "--json",
      ]);

      const parsed = JSON.parse(stdout);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: Record<string, unknown>) => ({
        path: String(item.path ?? ""),
        title: String(item.title ?? ""),
        snippet: String(item.snippet ?? item.content ?? ""),
        score: Number(item.score ?? 0),
      }));
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 2: Write detect.ts**

```typescript
// src/search/detect.ts
import type { SearchProvider } from "./search-provider.js";
import { QmdProvider } from "./qmd-provider.js";
import { SimpleProvider } from "./simple-provider.js";

export async function detectSearchProvider(): Promise<SearchProvider> {
  const qmd = new QmdProvider();

  if (await qmd.available()) {
    return qmd;
  }

  return new SimpleProvider();
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd ~/Projects/wiki-mcp && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/search/qmd-provider.ts src/search/detect.ts
git commit -m "feat: qmd search provider and auto-detection"
```

---

### Task 9: Tool — wiki_init

**Files:**
- Create: `src/tools/init.ts`
- Create: `tests/tools/init.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tools/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleInit } from "../../src/tools/init.js";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/init-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("wiki_init handler", () => {
  it("creates vault structure with defaults", async () => {
    const result = await handleInit({ path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(existsSync(join(TEST_DIR, "raw"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "raw/assets"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "wiki"))).toBe(true);
    expect(existsSync(join(TEST_DIR, ".wiki-schema.yaml"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "index.md"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "log.md"))).toBe(true);

    const schema = readFileSync(join(TEST_DIR, ".wiki-schema.yaml"), "utf-8");
    expect(schema).toContain("linkStyle:");
  });

  it("creates vault with custom name and linkStyle", async () => {
    const result = await handleInit({
      path: TEST_DIR,
      name: "Research Wiki",
      linkStyle: "markdown",
    });

    expect(result.success).toBe(true);
    const schema = readFileSync(join(TEST_DIR, ".wiki-schema.yaml"), "utf-8");
    expect(schema).toContain("Research Wiki");
    expect(schema).toContain("markdown");
  });

  it("does not overwrite existing vault", async () => {
    await handleInit({ path: TEST_DIR });
    const result = await handleInit({ path: TEST_DIR });

    expect(result.success).toBe(true);
    expect(result.message).toContain("already");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/init.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/tools/init.ts
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { DEFAULT_SCHEMA, type WikiSchema } from "../config/types.js";

interface InitInput {
  path: string;
  name?: string;
  linkStyle?: "wikilink" | "markdown";
}

interface InitOutput {
  success: boolean;
  message: string;
  created: string[];
}

export async function handleInit(input: InitInput): Promise<InitOutput> {
  const { path: vaultPath, name, linkStyle } = input;
  const schemaPath = join(vaultPath, ".wiki-schema.yaml");

  if (existsSync(schemaPath)) {
    return {
      success: true,
      message: "Vault already initialized — skipping without overwrite.",
      created: [],
    };
  }

  const schema: WikiSchema = {
    ...DEFAULT_SCHEMA,
    name: name ?? DEFAULT_SCHEMA.name,
    linkStyle: linkStyle ?? DEFAULT_SCHEMA.linkStyle,
  };

  const created: string[] = [];

  const dirs = [
    schema.paths.raw,
    schema.paths.assets,
    schema.paths.wiki,
  ];

  for (const dir of dirs) {
    const absDir = join(vaultPath, dir);
    if (!existsSync(absDir)) {
      mkdirSync(absDir, { recursive: true });
      created.push(dir + "/");
    }
  }

  const yamlContent = yaml.dump(schema, { lineWidth: -1 });
  writeFileSync(schemaPath, yamlContent, "utf-8");
  created.push(".wiki-schema.yaml");

  const indexPath = join(vaultPath, "index.md");
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, "# Wiki Index\n", "utf-8");
    created.push("index.md");
  }

  const logPath = join(vaultPath, "log.md");
  if (!existsSync(logPath)) {
    const today = new Date().toISOString().slice(0, 10);
    const logContent = `# Wiki Log\n\n## [${today}] init | ${schema.name}\nVault initialized.\n`;
    writeFileSync(logPath, logContent, "utf-8");
    created.push("log.md");
  }

  return {
    success: true,
    message: `Vault initialized at ${vaultPath}`,
    created,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/init.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/init.ts tests/tools/init.test.ts
git commit -m "feat: wiki_init tool — vault initialization"
```

---

### Task 10: Tools — CRUD (create, read, update, delete)

**Files:**
- Create: `src/tools/create-page.ts`
- Create: `src/tools/read-page.ts`
- Create: `src/tools/update-page.ts`
- Create: `src/tools/delete-page.ts`
- Create: `tests/tools/crud.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tools/crud.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleCreatePage } from "../../src/tools/create-page.js";
import { handleReadPage } from "../../src/tools/read-page.js";
import { handleUpdatePage } from "../../src/tools/update-page.js";
import { handleDeletePage } from "../../src/tools/delete-page.js";
import { WikiManager } from "../../src/core/wiki-manager.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { IndexManager } from "../../src/core/index-manager.js";
import { LogManager } from "../../src/core/log-manager.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/crud-test");

function createServices() {
  const linkResolver = new LinkResolver("wikilink", "wiki");
  const indexManager = new IndexManager(TEST_DIR, linkResolver);
  const logManager = new LogManager(TEST_DIR);
  const wikiManager = new WikiManager(TEST_DIR, DEFAULT_SCHEMA, linkResolver, indexManager, logManager);
  return { wikiManager, indexManager, logManager, linkResolver };
}

beforeEach(() => {
  mkdirSync(join(TEST_DIR, "wiki"), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("CRUD tools", () => {
  it("create → read → update → delete lifecycle", async () => {
    const services = createServices();

    // Create
    const createResult = await handleCreatePage(
      {
        title: "Test Page",
        content: "---\ntitle: Test Page\ntype: concept\ntags: []\ncreated: 2026-04-06\n---\n\n# Test Page\n\nHello.",
        pageType: "concept",
      },
      services.wikiManager
    );
    expect(createResult.success).toBe(true);
    expect(createResult.path).toBe("wiki/test-page.md");

    // Read
    const readResult = await handleReadPage(
      { title: "Test Page" },
      services.wikiManager
    );
    expect(readResult.content).toContain("Hello.");
    expect(readResult.frontmatter.title).toBe("Test Page");

    // Update
    const updateResult = await handleUpdatePage(
      {
        path: "wiki/test-page.md",
        content: "---\ntitle: Test Page\ntype: concept\ntags: [updated]\ncreated: 2026-04-06\nupdated: 2026-04-06\n---\n\n# Test Page\n\nUpdated.",
      },
      services.wikiManager
    );
    expect(updateResult.success).toBe(true);

    // Verify update
    const readAgain = await handleReadPage(
      { path: "wiki/test-page.md" },
      services.wikiManager
    );
    expect(readAgain.content).toContain("Updated.");

    // Delete
    const deleteResult = await handleDeletePage(
      { path: "wiki/test-page.md" },
      services.wikiManager
    );
    expect(deleteResult.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/crud.test.ts`
Expected: FAIL

- [ ] **Step 3: Write all four tool handlers**

```typescript
// src/tools/create-page.ts
import type { WikiManager } from "../core/wiki-manager.js";

interface CreatePageInput {
  title: string;
  content: string;
  pageType?: string;
}

export async function handleCreatePage(
  input: CreatePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; path: string; message: string }> {
  return wikiManager.createPage(input.title, input.content, input.pageType);
}
```

```typescript
// src/tools/read-page.ts
import type { WikiManager } from "../core/wiki-manager.js";
import type { PageData } from "../config/types.js";

interface ReadPageInput {
  title?: string;
  path?: string;
}

export async function handleReadPage(
  input: ReadPageInput,
  wikiManager: WikiManager
): Promise<PageData> {
  return wikiManager.readPage(input);
}
```

```typescript
// src/tools/update-page.ts
import type { WikiManager } from "../core/wiki-manager.js";

interface UpdatePageInput {
  path: string;
  content: string;
}

export async function handleUpdatePage(
  input: UpdatePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; path: string; message: string }> {
  return wikiManager.updatePage(input.path, input.content);
}
```

```typescript
// src/tools/delete-page.ts
import type { WikiManager } from "../core/wiki-manager.js";

interface DeletePageInput {
  path: string;
}

export async function handleDeletePage(
  input: DeletePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; message: string; brokenLinks: string[] }> {
  return wikiManager.deletePage(input.path);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/crud.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/create-page.ts src/tools/read-page.ts src/tools/update-page.ts src/tools/delete-page.ts tests/tools/crud.test.ts
git commit -m "feat: CRUD tool handlers — create, read, update, delete pages"
```

---

### Task 11: Tool — wiki_ingest

**Files:**
- Create: `src/tools/ingest.ts`
- Create: `tests/tools/ingest.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tools/ingest.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleIngest } from "../../src/tools/ingest.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/ingest-test");

beforeEach(() => {
  mkdirSync(join(TEST_DIR, "raw"), { recursive: true });
  mkdirSync(join(TEST_DIR, "wiki"), { recursive: true });

  writeFileSync(
    join(TEST_DIR, "raw/article.md"),
    "# Great Article\n\nThis is a great article about transformers.",
    "utf-8"
  );

  writeFileSync(
    join(TEST_DIR, "wiki/existing-page.md"),
    "---\ntitle: Existing Page\ntype: concept\n---\n\nAlready here.",
    "utf-8"
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("wiki_ingest handler", () => {
  it("reads source and returns content with context", async () => {
    const result = await handleIngest(
      { source_path: "raw/article.md" },
      TEST_DIR,
      DEFAULT_SCHEMA
    );

    expect(result.content).toContain("Great Article");
    expect(result.content).toContain("transformers");
    expect(result.existing_pages).toContain("wiki/existing-page.md");
    expect(result.schema).toBeDefined();
    expect(result.schema.pageTypes).toBeDefined();
  });

  it("throws if source does not exist", async () => {
    await expect(
      handleIngest(
        { source_path: "raw/nonexistent.md" },
        TEST_DIR,
        DEFAULT_SCHEMA
      )
    ).rejects.toThrow("not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/ingest.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/tools/ingest.ts
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { WikiSchema } from "../config/types.js";

interface IngestInput {
  source_path: string;
}

interface IngestOutput {
  content: string;
  existing_pages: string[];
  schema: {
    pageTypes: WikiSchema["pageTypes"];
    linkStyle: WikiSchema["linkStyle"];
  };
}

export async function handleIngest(
  input: IngestInput,
  vaultPath: string,
  schema: WikiSchema
): Promise<IngestOutput> {
  const absPath = join(vaultPath, input.source_path);

  if (!existsSync(absPath)) {
    throw new Error(`Source not found: ${input.source_path}`);
  }

  const content = readFileSync(absPath, "utf-8");

  const wikiDir = join(vaultPath, schema.paths.wiki);
  let existingPages: string[] = [];

  if (existsSync(wikiDir)) {
    existingPages = readdirSync(wikiDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `${schema.paths.wiki}/${f}`);
  }

  return {
    content,
    existing_pages: existingPages,
    schema: {
      pageTypes: schema.pageTypes,
      linkStyle: schema.linkStyle,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/ingest.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/ingest.ts tests/tools/ingest.test.ts
git commit -m "feat: wiki_ingest tool — reads source and returns context for LLM processing"
```

---

### Task 12: Tool — wiki_search

**Files:**
- Create: `src/tools/search.ts`
- Create: `tests/tools/search.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tools/search.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleSearch } from "../../src/tools/search.js";
import { SimpleProvider } from "../../src/search/simple-provider.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/search-tool-test");
const WIKI_DIR = join(TEST_DIR, "wiki");

beforeEach(() => {
  mkdirSync(WIKI_DIR, { recursive: true });

  writeFileSync(
    join(WIKI_DIR, "attention.md"),
    "---\ntitle: Attention\n---\n\nAttention is a mechanism in deep learning.",
    "utf-8"
  );
  writeFileSync(
    join(WIKI_DIR, "bert.md"),
    "---\ntitle: BERT\n---\n\nBERT uses bidirectional attention.",
    "utf-8"
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("wiki_search handler", () => {
  it("returns search results", async () => {
    const provider = new SimpleProvider();
    const result = await handleSearch(
      { query: "attention" },
      provider,
      WIKI_DIR
    );

    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0].title).toBe("Attention");
  });

  it("respects max_results", async () => {
    const provider = new SimpleProvider();
    const result = await handleSearch(
      { query: "attention", max_results: 1 },
      provider,
      WIKI_DIR
    );

    expect(result.results).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/search.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/tools/search.ts
import type { SearchProvider } from "../search/search-provider.js";
import type { SearchResult } from "../config/types.js";

interface SearchInput {
  query: string;
  max_results?: number;
}

interface SearchOutput {
  results: SearchResult[];
}

export async function handleSearch(
  input: SearchInput,
  searchProvider: SearchProvider,
  wikiDir: string
): Promise<SearchOutput> {
  const maxResults = input.max_results ?? 10;

  const results = await searchProvider.search(input.query, {
    maxResults,
    wikiDir,
  });

  return { results };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/search.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/search.ts tests/tools/search.test.ts
git commit -m "feat: wiki_search tool — search via pluggable provider"
```

---

### Task 13: Tool — wiki_lint

**Files:**
- Create: `src/tools/lint.ts`
- Create: `tests/tools/lint.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/tools/lint.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleLint } from "../../src/tools/lint.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/lint-test");
const WIKI_DIR = join(TEST_DIR, "wiki");

beforeEach(() => {
  mkdirSync(WIKI_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("wiki_lint handler", () => {
  it("detects orphan pages (no inbound links)", async () => {
    writeFileSync(
      join(WIKI_DIR, "page-a.md"),
      "---\ntitle: Page A\ntype: concept\n---\n\nSee [[Page B]].",
      "utf-8"
    );
    writeFileSync(
      join(WIKI_DIR, "page-b.md"),
      "---\ntitle: Page B\ntype: concept\n---\n\nLinked from A.",
      "utf-8"
    );
    writeFileSync(
      join(WIKI_DIR, "page-c.md"),
      "---\ntitle: Page C\ntype: concept\n---\n\nAll alone.",
      "utf-8"
    );

    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);

    expect(result.orphan_pages).toContain("wiki/page-a.md");
    expect(result.orphan_pages).toContain("wiki/page-c.md");
    expect(result.orphan_pages).not.toContain("wiki/page-b.md");
  });

  it("detects broken links", async () => {
    writeFileSync(
      join(WIKI_DIR, "linker.md"),
      "---\ntitle: Linker\ntype: concept\n---\n\nSee [[Nonexistent Page]].",
      "utf-8"
    );

    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);

    expect(result.broken_links).toContainEqual({
      from: "wiki/linker.md",
      to: "Nonexistent Page",
    });
  });

  it("detects pages without frontmatter", async () => {
    writeFileSync(
      join(WIKI_DIR, "no-fm.md"),
      "# No Frontmatter\n\nJust content.",
      "utf-8"
    );

    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);

    expect(result.pages_without_frontmatter).toContain("wiki/no-fm.md");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/lint.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/tools/lint.ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { WikiSchema } from "../config/types.js";
import type { LinkResolver } from "../core/link-resolver.js";

interface LintInput {
  scope?: "full" | "recent";
}

interface BrokenLink {
  from: string;
  to: string;
}

interface LintOutput {
  orphan_pages: string[];
  broken_links: BrokenLink[];
  missing_pages: string[];
  pages_without_frontmatter: string[];
  stale_index_entries: string[];
}

export async function handleLint(
  input: LintInput,
  vaultPath: string,
  schema: WikiSchema,
  linkResolver: LinkResolver
): Promise<LintOutput> {
  const wikiDir = join(vaultPath, schema.paths.wiki);

  if (!existsSync(wikiDir)) {
    return {
      orphan_pages: [],
      broken_links: [],
      missing_pages: [],
      pages_without_frontmatter: [],
      stale_index_entries: [],
    };
  }

  const files = readdirSync(wikiDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => `${schema.paths.wiki}/${f}`);

  const titleToPath = new Map<string, string>();
  const pathToTitle = new Map<string, string>();
  const inboundLinks = new Set<string>();
  const brokenLinks: BrokenLink[] = [];
  const pagesWithoutFrontmatter: string[] = [];

  for (const file of files) {
    const absPath = join(vaultPath, file);
    const raw = readFileSync(absPath, "utf-8");
    const parsed = matter(raw);

    const title = (parsed.data.title as string) ?? file.replace(/.*\//, "").replace(".md", "");
    titleToPath.set(title, file);
    pathToTitle.set(file, title);

    if (Object.keys(parsed.data).length === 0) {
      pagesWithoutFrontmatter.push(file);
    }

    const links = linkResolver.parseLinks(raw);
    for (const link of links) {
      inboundLinks.add(link.target);
    }
  }

  const orphanPages: string[] = [];
  const missingPagesSet = new Set<string>();

  for (const file of files) {
    const title = pathToTitle.get(file)!;
    if (!inboundLinks.has(title)) {
      orphanPages.push(file);
    }
  }

  for (const file of files) {
    const absPath = join(vaultPath, file);
    const raw = readFileSync(absPath, "utf-8");
    const links = linkResolver.parseLinks(raw);

    for (const link of links) {
      if (!titleToPath.has(link.target)) {
        brokenLinks.push({ from: file, to: link.target });
        missingPagesSet.add(link.target);
      }
    }
  }

  const staleIndexEntries: string[] = [];
  const indexPath = join(vaultPath, "index.md");
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    const indexLinks = linkResolver.parseLinks(indexContent);
    for (const link of indexLinks) {
      if (!titleToPath.has(link.target)) {
        staleIndexEntries.push(link.target);
      }
    }
  }

  return {
    orphan_pages: orphanPages,
    broken_links: brokenLinks,
    missing_pages: Array.from(missingPagesSet),
    pages_without_frontmatter: pagesWithoutFrontmatter,
    stale_index_entries: staleIndexEntries,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/Projects/wiki-mcp && npx vitest run tests/tools/lint.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/lint.ts tests/tools/lint.test.ts
git commit -m "feat: wiki_lint tool — health check for orphans, broken links, missing frontmatter"
```

---

### Task 14: Tool Registration — Wire All Tools to MCP Server

**Files:**
- Create: `src/tools/index.ts`
- Create: `src/server.ts`

- [ ] **Step 1: Write the tool registration module**

```typescript
// src/tools/index.ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { WikiManager } from "../core/wiki-manager.js";
import type { LinkResolver } from "../core/link-resolver.js";
import type { WikiSchema } from "../config/types.js";
import type { SearchProvider } from "../search/search-provider.js";
import { handleInit } from "./init.js";
import { handleCreatePage } from "./create-page.js";
import { handleReadPage } from "./read-page.js";
import { handleUpdatePage } from "./update-page.js";
import { handleDeletePage } from "./delete-page.js";
import { handleIngest } from "./ingest.js";
import { handleSearch } from "./search.js";
import { handleLint } from "./lint.js";

interface Services {
  wikiManager: WikiManager;
  linkResolver: LinkResolver;
  searchProvider: SearchProvider;
  schema: WikiSchema;
  vaultPath: string;
}

export function registerTools(server: McpServer, services: Services): void {
  const { wikiManager, linkResolver, searchProvider, schema, vaultPath } = services;
  const wikiDir = `${vaultPath}/${schema.paths.wiki}`;

  server.registerTool(
    "wiki_init",
    {
      title: "Initialize Wiki Vault",
      description: "Create a new wiki vault with folder structure and default config",
      inputSchema: z.object({
        path: z.string().describe("Absolute path for the new vault"),
        name: z.string().optional().describe("Wiki name"),
        linkStyle: z.enum(["wikilink", "markdown"]).optional().describe("Link format"),
      }),
    },
    async ({ path, name, linkStyle }) => {
      const result = await handleInit({ path, name, linkStyle });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_ingest",
    {
      title: "Ingest Source",
      description: "Read a raw source document and return its content with context for wiki processing",
      inputSchema: z.object({
        source_path: z.string().describe("Path to source file relative to vault root, e.g. raw/article.md"),
      }),
    },
    async ({ source_path }) => {
      const result = await handleIngest({ source_path }, vaultPath, schema);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_create_page",
    {
      title: "Create Wiki Page",
      description: "Create a new wiki page with title, content (including frontmatter), and optional page type",
      inputSchema: z.object({
        title: z.string().describe("Page title"),
        content: z.string().describe("Full markdown content including YAML frontmatter"),
        pageType: z.string().optional().describe("Page type: source, concept, entity, or comparison"),
      }),
    },
    async ({ title, content, pageType }) => {
      const result = await handleCreatePage({ title, content, pageType }, wikiManager);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_read_page",
    {
      title: "Read Wiki Page",
      description: "Read a wiki page by title or path",
      inputSchema: z.object({
        title: z.string().optional().describe("Page title to look up"),
        path: z.string().optional().describe("Direct path to the page, e.g. wiki/page.md"),
      }),
    },
    async ({ title, path }) => {
      try {
        const result = await handleReadPage({ title, path }, wikiManager);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "wiki_update_page",
    {
      title: "Update Wiki Page",
      description: "Update an existing wiki page with new content",
      inputSchema: z.object({
        path: z.string().describe("Path to the page, e.g. wiki/page.md"),
        content: z.string().describe("Full new markdown content including frontmatter"),
      }),
    },
    async ({ path, content }) => {
      const result = await handleUpdatePage({ path, content }, wikiManager);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_delete_page",
    {
      title: "Delete Wiki Page",
      description: "Delete a wiki page and report any broken links",
      inputSchema: z.object({
        path: z.string().describe("Path to the page to delete, e.g. wiki/page.md"),
      }),
    },
    async ({ path }) => {
      const result = await handleDeletePage({ path }, wikiManager);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_search",
    {
      title: "Search Wiki",
      description: "Search across wiki pages using text or semantic search",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        max_results: z.number().optional().describe("Maximum results to return (default: 10)"),
      }),
    },
    async ({ query, max_results }) => {
      const result = await handleSearch({ query, max_results }, searchProvider, wikiDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "wiki_lint",
    {
      title: "Lint Wiki",
      description: "Health-check the wiki: find orphan pages, broken links, missing frontmatter, stale index entries",
      inputSchema: z.object({
        scope: z.enum(["full", "recent"]).optional().describe("Scan scope: full (all pages) or recent (since last lint)"),
      }),
    },
    async ({ scope }) => {
      const result = await handleLint({ scope }, vaultPath, schema, linkResolver);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
```

- [ ] **Step 2: Write the server factory**

```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { loadSchema } from "./config/schema-loader.js";
import { LinkResolver } from "./core/link-resolver.js";
import { LogManager } from "./core/log-manager.js";
import { IndexManager } from "./core/index-manager.js";
import { WikiManager } from "./core/wiki-manager.js";
import { detectSearchProvider } from "./search/detect.js";
import { registerTools } from "./tools/index.js";

export interface ServerConfig {
  vaultPath: string;
}

export async function createServer(config: ServerConfig): Promise<McpServer> {
  const { vaultPath } = config;

  const schema = loadSchema(vaultPath);
  const linkResolver = new LinkResolver(schema.linkStyle, schema.paths.wiki);
  const logManager = new LogManager(vaultPath);
  const indexManager = new IndexManager(vaultPath, linkResolver);
  const wikiManager = new WikiManager(vaultPath, schema, linkResolver, indexManager, logManager);
  const searchProvider = await detectSearchProvider();

  const server = new McpServer({
    name: "wiki-mcp",
    version: "0.1.0",
  });

  registerTools(server, {
    wikiManager,
    linkResolver,
    searchProvider,
    schema,
    vaultPath,
  });

  return server;
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd ~/Projects/wiki-mcp && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/tools/index.ts src/server.ts
git commit -m "feat: tool registration and server factory — all 8 tools wired to MCP server"
```

---

### Task 15: CLI Entrypoint & Transports

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Install HTTP transport dependencies**

```bash
cd ~/Projects/wiki-mcp
npm install express @modelcontextprotocol/express
npm install -D @types/express
```

- [ ] **Step 2: Write the CLI entrypoint**

```typescript
// src/cli.ts
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { createServer } from "./server.js";
import { handleInit } from "./tools/init.js";

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      vault: { type: "string", short: "v" },
      transport: { type: "string", short: "t", default: "stdio" },
      port: { type: "string", short: "p", default: "3000" },
    },
    allowPositionals: true,
    strict: false,
  });

  // Handle "wiki-mcp init <path>" subcommand
  if (positionals[0] === "init") {
    const initPath = resolve(positionals[1] ?? ".");
    const result = await handleInit({ path: initPath });
    console.log(result.message);
    for (const f of result.created) {
      console.log(`  + ${f}`);
    }
    process.exit(0);
  }

  const vaultPath = resolve(values.vault ?? ".");
  const transportType = values.transport ?? "stdio";

  if (transportType === "stdio") {
    const server = await createServer({ vaultPath });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`wiki-mcp running (stdio) — vault: ${vaultPath}`);
  } else if (transportType === "sse" || transportType === "http") {
    const port = parseInt(values.port ?? "3000", 10);

    // Dynamic imports — only loaded when HTTP transport is used
    const { createMcpExpressApp } = await import("@modelcontextprotocol/express");
    const { NodeStreamableHTTPServerTransport } = await import("@modelcontextprotocol/node");
    const { isInitializeRequest } = await import("@modelcontextprotocol/server");
    const { randomUUID } = await import("node:crypto");

    const app = createMcpExpressApp();

    const transports: Record<string, InstanceType<typeof NodeStreamableHTTPServerTransport>> = {};

    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const transport = new NodeStreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id: string) => {
            transports[id] = transport;
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        const sessionServer = await createServer({ vaultPath });
        await sessionServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid session" },
        id: null,
      });
    });

    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res);
      } else {
        res.status(400).send("Invalid session");
      }
    });

    app.listen(port, "127.0.0.1", () => {
      console.error(`wiki-mcp running (http) — vault: ${vaultPath} — http://127.0.0.1:${port}/mcp`);
    });
  } else {
    console.error(`Unknown transport: ${transportType}. Use "stdio" or "sse".`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Build and verify**

Run: `cd ~/Projects/wiki-mcp && npm run build`
Expected: `dist/server.js`, `dist/cli.js` generated without errors

- [ ] **Step 4: Test stdio startup**

Run: `cd ~/Projects/wiki-mcp && echo '{}' | node dist/cli.js --vault /tmp/test-vault 2>&1 | head -1`
Expected: Output contains `wiki-mcp running (stdio)`

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts package.json package-lock.json
git commit -m "feat: CLI entrypoint with stdio and HTTP transports"
```

---

### Task 16: Example Vaults & README

**Files:**
- Create: `examples/vault-research/.wiki-schema.yaml`
- Create: `examples/vault-personal/.wiki-schema.yaml`
- Create: `README.md`

- [ ] **Step 1: Create example vault configs**

```yaml
# examples/vault-research/.wiki-schema.yaml
name: "Research Wiki"
version: 1
linkStyle: "wikilink"
paths:
  raw: "raw"
  wiki: "wiki"
  assets: "raw/assets"
pageTypes:
  source:
    description: "Summary of a research paper or article"
    requiredFields: [title, type, source_path, created]
  concept:
    description: "A research concept or technique"
    requiredFields: [title, type, tags, created]
  entity:
    description: "A researcher, lab, or organization"
    requiredFields: [title, type, tags, created]
  comparison:
    description: "Comparison between approaches or methods"
    requiredFields: [title, type, subjects, created]
```

```yaml
# examples/vault-personal/.wiki-schema.yaml
name: "Personal Wiki"
version: 1
linkStyle: "markdown"
paths:
  raw: "raw"
  wiki: "wiki"
  assets: "raw/assets"
pageTypes:
  source:
    description: "Notes from a book, article, or podcast"
    requiredFields: [title, type, source_path, created]
  concept:
    description: "An idea or topic"
    requiredFields: [title, type, tags, created]
  entity:
    description: "A person, place, or thing"
    requiredFields: [title, type, tags, created]
  comparison:
    description: "Comparison or decision log"
    requiredFields: [title, type, subjects, created]
```

- [ ] **Step 2: Create README.md**

Write a README covering: overview, quick start, Claude Desktop config, tools table, transport options, search info, configuration, and license (MIT). Reference the Karpathy gist as origin.

- [ ] **Step 3: Commit**

```bash
git add examples/ README.md
git commit -m "docs: README, example vault configs"
```

---

### Task 17: Run All Tests & Final Verification

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

Run: `cd ~/Projects/wiki-mcp && npm test`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `cd ~/Projects/wiki-mcp && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full build**

Run: `cd ~/Projects/wiki-mcp && npm run build`
Expected: `dist/` contains `server.js`, `server.d.ts`, `cli.js`

- [ ] **Step 4: Test CLI init command end-to-end**

```bash
rm -rf /tmp/wiki-mcp-e2e-test
node ~/Projects/wiki-mcp/dist/cli.js init /tmp/wiki-mcp-e2e-test
ls -la /tmp/wiki-mcp-e2e-test
```
Expected: Vault initialized with `raw/`, `wiki/`, `.wiki-schema.yaml`, `index.md`, `log.md`

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: final adjustments from integration testing"
```
