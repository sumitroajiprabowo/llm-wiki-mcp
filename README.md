# wiki-mcp

MCP server for building and maintaining LLM-powered knowledge wikis.

Inspired by [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/1dd0294ef9567971c1e4348a90d69285) -- drop raw sources into a vault, let an LLM distill them into an interlinked wiki with typed pages, backlinks, and a structured index.

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

## License

MIT
