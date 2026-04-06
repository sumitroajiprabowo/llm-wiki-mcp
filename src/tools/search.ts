import type { SearchProvider } from '../search/search-provider.js';
import type { SearchResult } from '../config/types.js';

interface SearchInput {
  query: string;
  max_results?: number;
}

interface SearchOutput {
  results: SearchResult[];
}

export async function handleSearch(
  input: SearchInput,
  searchProvider: SearchProvider,
  wikiDir: string,
): Promise<SearchOutput> {
  const maxResults = input.max_results ?? 10;

  const results = await searchProvider.search(input.query, {
    maxResults,
    wikiDir,
  });

  return { results };
}
