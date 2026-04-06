// src/config/schema-loader.ts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { DEFAULT_SCHEMA, type WikiSchema } from './types.js';

export function loadSchema(vaultPath: string): WikiSchema {
  const configPath = join(vaultPath, '.wiki-schema.yaml');

  if (!existsSync(configPath)) {
    return { ...DEFAULT_SCHEMA };
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw) as Partial<WikiSchema>;

  if (parsed.linkStyle && parsed.linkStyle !== 'wikilink' && parsed.linkStyle !== 'markdown') {
    throw new Error(`Invalid linkStyle: "${parsed.linkStyle}". Must be "wikilink" or "markdown".`);
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
