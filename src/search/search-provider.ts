import type { SearchResult, SearchOptions } from '../config/types.js';

export interface SearchProvider {
  name: string;
  available(): Promise<boolean>;
  index(wikiDir: string): Promise<void>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}
