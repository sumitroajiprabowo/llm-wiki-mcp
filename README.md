# wiki-mcp

An MCP server that implements [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — enabling any MCP-compatible LLM client to build and maintain a persistent, compounding knowledge base as structured markdown files.

## The Idea

Most LLM + document workflows use RAG: retrieve chunks at query time, generate an answer, discard context. The LLM rediscovers knowledge from scratch on every question. Nothing accumulates.

The LLM Wiki pattern is different. Instead of retrieving from raw documents, the LLM **incrementally builds and maintains a persistent wiki** — a structured, interlinked collection of markdown files. When you add a new source, the LLM reads it, extracts key information, and integrates it into the existing wiki — updating entity pages, revising summaries, noting contradictions, strengthening the evolving synthesis.

**The wiki is a persistent, compounding artifact.** Cross-references are already there. Contradictions are already flagged. The synthesis reflects everything you've read. It keeps getting richer with every source you add and every question you ask.

> You never write the wiki yourself — the LLM writes and maintains all of it. You're in charge of sourcing, exploration, and asking the right questions. The LLM does all the grunt work. — [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

### Three Layers

| Layer | Owner | Description |
|-------|-------|-------------|
| **Raw Sources** | You curate | Immutable source documents — articles, papers, notes. The LLM reads but never modifies. |
| **The Wiki** | LLM writes | Markdown pages — summaries, entities, concepts, comparisons. The LLM creates, updates, and cross-references. |
| **The Schema** | Co-evolved | Configuration that tells the LLM how the wiki is structured and what conventions to follow. |

### Three Operations

| Operation | What happens |
|-----------|-------------|
| **Ingest** | Drop a new source, LLM processes it — writes summary, updates entities, cross-references across 10-15 pages. |
| **Query** | Ask questions against the wiki. Good answers get filed back as new pages — explorations compound too. |
| **Lint** | Health-check: find contradictions, orphan pages, stale claims, missing cross-references. |

### Use Cases

- **Research** — papers, articles, reports building into a comprehensive wiki with an evolving thesis
- **Reading a book** — chapter-by-chapter, building pages for characters, themes, plot threads
- **Personal** — goals, health, self-improvement, journal entries structured over time
- **Business/team** — Slack threads, meeting transcripts, customer calls maintained by LLM
- **Competitive analysis, due diligence, trip planning, course notes, hobby deep-dives**

### Why It Works

> Humans abandon wikis because the maintenance burden grows faster than the value. LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass.

Works with [Obsidian](https://obsidian.md/) — the LLM edits files, you browse in real time via graph view. Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase.

## Quick Start

Initialize a new vault:

```bash
npx wiki-mcp init ./my-wiki
```

Run the server (stdio transport, for Claude Desktop / MCP clients):

```bash
npx wiki-mcp --vault ./my-wiki
```

### Claude Desktop Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wiki-mcp": {
      "command": "npx",
      "args": ["wiki-mcp", "--vault", "/absolute/path/to/your/vault"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `wiki_init` | Create a new wiki vault with folder structure and default config |
| `wiki_ingest` | Read a raw source document and return its content with context |
| `wiki_create_page` | Create a new wiki page with frontmatter and typed content |
| `wiki_read_page` | Read a wiki page by title or path |
| `wiki_update_page` | Update an existing wiki page |
| `wiki_delete_page` | Delete a wiki page and report broken links |
| `wiki_search` | Search across wiki pages (text or semantic) |
| `wiki_lint` | Health-check: orphan pages, broken links, missing frontmatter |

## Transports

**stdio** (default) -- for Claude Desktop and other MCP clients:

```bash
wiki-mcp --vault ./my-wiki
```

**HTTP** (Streamable HTTP) -- for web-based clients:

```bash
wiki-mcp --vault ./my-wiki --transport http --port 3000
```

The HTTP transport serves an MCP-compliant Streamable HTTP endpoint at `http://127.0.0.1:3000/mcp`.

## Search

wiki-mcp supports two search backends:

- **qmd** (optional) -- if `qmd` is installed and available on PATH, wiki-mcp uses it for semantic/hybrid search.
- **Simple** (default fallback) -- case-insensitive substring search across page content. No external dependencies.

## Configuration

Each vault has a `.wiki-schema.yaml` at its root:

```yaml
name: "My Wiki"
version: 1
linkStyle: "wikilink"        # or "markdown"
paths:
  raw: "raw"
  wiki: "wiki"
  assets: "raw/assets"
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
```

See `examples/` for research and personal vault configurations.

## Vault Structure

```
my-wiki/
  .wiki-schema.yaml    # vault configuration
  index.md             # auto-maintained page catalog
  log.md               # append-only operation log
  raw/                 # source documents (articles, PDFs, notes)
    assets/            # images and attachments
  wiki/                # generated wiki pages
```

## Development

```bash
npm install
npm run build
npm test
```

## Obsidian Integration

wiki-mcp generates Obsidian-compatible markdown. Set `linkStyle: "wikilink"` in your schema (default) for native `[[wikilinks]]`, or `"markdown"` for standard `[links](path.md)` if you prefer other editors.

**Tips from Karpathy's gist:**
- Use [Obsidian Web Clipper](https://obsidian.md/clipper) to convert web articles to markdown sources
- Use Obsidian's graph view to see the shape of your wiki — hubs, orphans, connections
- Add [Dataview](https://github.com/blacksmithgu/obsidian-dataview) for dynamic tables from page frontmatter
- The wiki is just markdown files — version with git for free

## Credits

Based on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), which draws on Vannevar Bush's Memex (1945) — a personal knowledge store with associative trails between documents. The part Bush couldn't solve was who does the maintenance. The LLM handles that.

## License

MIT
