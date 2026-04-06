export interface WikiSchema {
  name: string;
  version: number;
  linkStyle: 'wikilink' | 'markdown';
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
  name: 'My Wiki',
  version: 1,
  linkStyle: 'wikilink',
  paths: {
    raw: 'raw',
    wiki: 'wiki',
    assets: 'raw/assets',
  },
  pageTypes: {
    source: {
      description: 'Summary of a raw source document',
      requiredFields: ['title', 'type', 'source_path', 'created'],
    },
    concept: {
      description: 'A concept or idea',
      requiredFields: ['title', 'type', 'tags', 'created'],
    },
    entity: {
      description: 'A person, organization, or thing',
      requiredFields: ['title', 'type', 'tags', 'created'],
    },
    comparison: {
      description: 'Comparison between concepts/entities',
      requiredFields: ['title', 'type', 'subjects', 'created'],
    },
  },
  tags: {
    required: false,
    suggested: [],
  },
  log: {
    prefix: '## [{date}] {operation} | {title}',
  },
};
