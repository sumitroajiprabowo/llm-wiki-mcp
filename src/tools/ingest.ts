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
