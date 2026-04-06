import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleSearch } from '../../src/tools/search.js';
import { SimpleProvider } from '../../src/search/simple-provider.js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/search-tool-test');
const WIKI_DIR = join(TEST_DIR, 'wiki');

beforeEach(() => {
  mkdirSync(WIKI_DIR, { recursive: true });
  writeFileSync(
    join(WIKI_DIR, 'attention.md'),
    '---\ntitle: Attention\n---\n\nAttention is a mechanism in deep learning.',
    'utf-8',
  );
  writeFileSync(
    join(WIKI_DIR, 'bert.md'),
    '---\ntitle: BERT\n---\n\nBERT uses bidirectional attention.',
    'utf-8',
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('wiki_search handler', () => {
  it('returns search results', async () => {
    const provider = new SimpleProvider();
    const result = await handleSearch({ query: 'attention' }, provider, WIKI_DIR);
    expect(result.results.length).toBeGreaterThanOrEqual(1);
    expect(result.results[0].title).toBe('Attention');
  });

  it('respects max_results', async () => {
    const provider = new SimpleProvider();
    const result = await handleSearch({ query: 'attention', max_results: 1 }, provider, WIKI_DIR);
    expect(result.results).toHaveLength(1);
  });
});
