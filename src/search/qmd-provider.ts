import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SearchResult, SearchOptions } from '../config/types.js';
import type { SearchProvider } from './search-provider.js';

const execFileAsync = promisify(execFile);

export class QmdProvider implements SearchProvider {
  name = 'qmd';

  async available(): Promise<boolean> {
    try {
      await execFileAsync('which', ['qmd']);
      return true;
    } catch {
      return false;
    }
  }

  async index(wikiDir: string): Promise<void> {
    try {
      await execFileAsync('qmd', ['index', '--dir', wikiDir]);
    } catch (err) {
      throw new Error(`qmd index failed: ${err}`);
    }
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const { maxResults, wikiDir } = options;

    try {
      const { stdout } = await execFileAsync('qmd', [
        'search',
        query,
        '--dir',
        wikiDir,
        '--limit',
        String(maxResults),
        '--json',
      ]);

      const parsed = JSON.parse(stdout);

      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: Record<string, unknown>) => ({
        path: String(item.path ?? ''),
        title: String(item.title ?? ''),
        snippet: String(item.snippet ?? item.content ?? ''),
        score: Number(item.score ?? 0),
      }));
    } catch {
      return [];
    }
  }
}
