// tests/config/schema-loader.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadSchema } from '../../src/config/schema-loader.js';
import { DEFAULT_SCHEMA } from '../../src/config/types.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/schema-test');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('loadSchema', () => {
  it('returns defaults when no config file exists', () => {
    const schema = loadSchema(TEST_DIR);
    expect(schema).toEqual(DEFAULT_SCHEMA);
  });

  it('loads and merges .wiki-schema.yaml with defaults', () => {
    const yaml = `
name: "Research Wiki"
linkStyle: "markdown"
paths:
  raw: "sources"
`;
    writeFileSync(join(TEST_DIR, '.wiki-schema.yaml'), yaml);
    const schema = loadSchema(TEST_DIR);
    expect(schema.name).toBe('Research Wiki');
    expect(schema.linkStyle).toBe('markdown');
    expect(schema.paths.raw).toBe('sources');
    expect(schema.paths.wiki).toBe('wiki');
    expect(schema.pageTypes).toEqual(DEFAULT_SCHEMA.pageTypes);
  });

  it('throws on invalid linkStyle', () => {
    writeFileSync(join(TEST_DIR, '.wiki-schema.yaml'), 'linkStyle: "invalid"');
    expect(() => loadSchema(TEST_DIR)).toThrow();
  });
});
