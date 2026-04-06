// src/core/index-manager.ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IndexEntry } from '../config/types.js';
import type { LinkResolver } from './link-resolver.js';

const INDEX_HEADER = '# Wiki Index\n';

const CATEGORY_MAP: Record<string, string> = {
  source: 'Sources',
  concept: 'Concepts',
  entity: 'Entities',
  comparison: 'Comparisons',
};

interface StoredIndex {
  entries: IndexEntry[];
}

export class IndexManager {
  private indexPath: string;

  constructor(
    vaultPath: string,
    private linkResolver: LinkResolver,
  ) {
    this.indexPath = join(vaultPath, 'index.md');
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

    const content = readFileSync(this.indexPath, 'utf-8');
    const entries: IndexEntry[] = [];

    // Matches: - <link> — <summary> <!-- path: <path> -->
    const pathCommentRegex = /<!--\s*path:\s*([^>]+?)\s*-->/;
    const summaryRegex = /^- .+? — (.+?)(?:\s*<!--.*-->)?$/;
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/;
    const mdlinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;

    let currentType = '';
    const categoryToType: Record<string, string> = {};
    for (const [type, category] of Object.entries(CATEGORY_MAP)) {
      categoryToType[category] = type;
    }

    for (const line of content.split('\n')) {
      if (line.startsWith('## ')) {
        const category = line.slice(3).trim();
        currentType = categoryToType[category] ?? 'other';
        continue;
      }

      if (!line.startsWith('- ')) continue;

      const summaryMatch = line.match(summaryRegex);
      const summary = summaryMatch?.[1]?.trim() ?? '';

      const pathMatch = line.match(pathCommentRegex);
      const storedPath = pathMatch?.[1] ?? '';

      const wikiMatch = line.match(wikilinkRegex);
      const mdMatch = line.match(mdlinkRegex);

      if (wikiMatch) {
        entries.push({
          title: wikiMatch[1],
          path: storedPath,
          pageType: currentType,
          summary,
        });
      } else if (mdMatch) {
        entries.push({
          title: mdMatch[1],
          path: storedPath || mdMatch[2],
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
      const category = CATEGORY_MAP[entry.pageType] ?? 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(entry);
    }

    let content = INDEX_HEADER;

    const orderedCategories = ['Sources', 'Concepts', 'Entities', 'Comparisons', 'Other'];

    for (const category of orderedCategories) {
      const entries = grouped[category];
      if (!entries || entries.length === 0) continue;

      content += `\n## ${category}\n\n`;
      for (const entry of entries) {
        const link = this.linkResolver.createLink(entry.title);
        content += `- ${link} — ${entry.summary} <!-- path: ${entry.path} -->\n`;
      }
    }

    writeFileSync(this.indexPath, content, 'utf-8');
  }
}
