import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
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
        scope: z.enum(["full", "recent"]).optional().describe("Scan scope: full or recent"),
      }),
    },
    async ({ scope }) => {
      const result = await handleLint({ scope }, vaultPath, schema, linkResolver);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
