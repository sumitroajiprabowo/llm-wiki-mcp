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
