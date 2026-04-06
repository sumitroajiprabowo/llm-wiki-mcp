import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleIngest } from '../../src/tools/ingest.js';
import { DEFAULT_SCHEMA } from '../../src/config/types.js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/ingest-test');

beforeEach(() => {
  mkdirSync(join(TEST_DIR, 'raw'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'wiki'), { recursive: true });
  writeFileSync(
    join(TEST_DIR, 'raw/article.md'),
    '# Great Article\n\nThis is about transformers.',
    'utf-8',
  );
  writeFileSync(
    join(TEST_DIR, 'wiki/existing-page.md'),
    '---\ntitle: Existing Page\ntype: concept\n---\n\nAlready here.',
    'utf-8',
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('wiki_ingest handler', () => {
  it('reads source and returns content with context', async () => {
    const result = await handleIngest({ source_path: 'raw/article.md' }, TEST_DIR, DEFAULT_SCHEMA);
    expect(result.content).toContain('Great Article');
    expect(result.existing_pages).toContain('wiki/existing-page.md');
    expect(result.schema.pageTypes).toBeDefined();
  });

  it('throws if source does not exist', async () => {
    await expect(
      handleIngest({ source_path: 'raw/nonexistent.md' }, TEST_DIR, DEFAULT_SCHEMA),
    ).rejects.toThrow('not found');
  });
});
