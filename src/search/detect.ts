import type { SearchProvider } from './search-provider.js';
import { QmdProvider } from './qmd-provider.js';
import { SimpleProvider } from './simple-provider.js';

export async function detectSearchProvider(): Promise<SearchProvider> {
  const qmd = new QmdProvider();

  if (await qmd.available()) {
    return qmd;
  }

  return new SimpleProvider();
}
