import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleInit } from '../../src/tools/init.js';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/init-test');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('wiki_init handler', () => {
  it('creates vault structure with defaults', async () => {
    const result = await handleInit({ path: TEST_DIR });
    expect(result.success).toBe(true);
    expect(existsSync(join(TEST_DIR, 'raw'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'raw/assets'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'wiki'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.wiki-schema.yaml'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'index.md'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'log.md'))).toBe(true);
    const schema = readFileSync(join(TEST_DIR, '.wiki-schema.yaml'), 'utf-8');
    expect(schema).toContain('linkStyle:');
  });

  it('creates vault with custom name and linkStyle', async () => {
    const result = await handleInit({
      path: TEST_DIR,
      name: 'Research Wiki',
      linkStyle: 'markdown',
    });
    expect(result.success).toBe(true);
    const schema = readFileSync(join(TEST_DIR, '.wiki-schema.yaml'), 'utf-8');
    expect(schema).toContain('Research Wiki');
    expect(schema).toContain('markdown');
  });

  it('does not overwrite existing vault', async () => {
    await handleInit({ path: TEST_DIR });
    const result = await handleInit({ path: TEST_DIR });
    expect(result.success).toBe(true);
    expect(result.message).toContain('already');
  });
});
