import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleProvider } from '../../src/search/simple-provider.js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/search-test/wiki');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });

  writeFileSync(
    join(TEST_DIR, 'attention.md'),
    `---
title: Attention Mechanism
---

# Attention Mechanism

Attention allows the model to focus on relevant parts of the input sequence.
It is a key component of the Transformer architecture.`,
    'utf-8',
  );

  writeFileSync(
    join(TEST_DIR, 'transformer.md'),
    `---
title: Transformer Architecture
---

# Transformer Architecture

The Transformer uses self-attention and feed-forward layers.
It was introduced in the paper "Attention Is All You Need".`,
    'utf-8',
  );

  writeFileSync(
    join(TEST_DIR, 'bert.md'),
    `---
title: BERT
---

# BERT

Bidirectional Encoder Representations from Transformers.
BERT uses masked language modeling for pre-training.`,
    'utf-8',
  );
});

afterEach(() => {
  rmSync(join(TEST_DIR, '..'), { recursive: true, force: true });
});

describe('SimpleProvider', () => {
  const provider = new SimpleProvider();

  it('is always available', async () => {
    expect(await provider.available()).toBe(true);
  });

  it('searches for a term and returns ranked results', async () => {
    const results = await provider.search('attention', {
      maxResults: 10,
      wikiDir: TEST_DIR,
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].title).toBe('Attention Mechanism');
  });

  it('respects maxResults', async () => {
    const results = await provider.search('transformer', {
      maxResults: 1,
      wikiDir: TEST_DIR,
    });
    expect(results).toHaveLength(1);
  });

  it('returns empty for no matches', async () => {
    const results = await provider.search('quantum computing', {
      maxResults: 10,
      wikiDir: TEST_DIR,
    });
    expect(results).toHaveLength(0);
  });
});
