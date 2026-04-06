// tests/core/index-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexManager } from '../../src/core/index-manager.js';
import { LinkResolver } from '../../src/core/link-resolver.js';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/index-test');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('IndexManager', () => {
  const linkResolver = new LinkResolver('wikilink', 'wiki');

  it('creates index.md and adds an entry', async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: 'Attention Mechanism',
      path: 'wiki/attention-mechanism.md',
      pageType: 'concept',
      summary: 'Core mechanism for focusing on relevant input',
    });

    const content = readFileSync(join(TEST_DIR, 'index.md'), 'utf-8');
    expect(content).toContain('# Wiki Index');
    expect(content).toContain('## Concepts');
    expect(content).toContain('[[Attention Mechanism]]');
    expect(content).toContain('Core mechanism for focusing on relevant input');
  });

  it('groups entries by page type', async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: 'Attention',
      path: 'wiki/attention.md',
      pageType: 'concept',
      summary: 'A concept',
    });
    await manager.addEntry({
      title: 'Vaswani',
      path: 'wiki/vaswani.md',
      pageType: 'entity',
      summary: 'A researcher',
    });

    const content = readFileSync(join(TEST_DIR, 'index.md'), 'utf-8');
    const conceptsPos = content.indexOf('## Concepts');
    const entitiesPos = content.indexOf('## Entities');
    expect(conceptsPos).toBeGreaterThan(-1);
    expect(entitiesPos).toBeGreaterThan(-1);
  });

  it('removes an entry by path', async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: 'To Remove',
      path: 'wiki/to-remove.md',
      pageType: 'concept',
      summary: 'Will be removed',
    });
    await manager.removeEntry('wiki/to-remove.md');

    const content = readFileSync(join(TEST_DIR, 'index.md'), 'utf-8');
    expect(content).not.toContain('To Remove');
  });

  it('reads all entries', async () => {
    const manager = new IndexManager(TEST_DIR, linkResolver);
    await manager.addEntry({
      title: 'Page A',
      path: 'wiki/page-a.md',
      pageType: 'source',
      summary: 'Summary A',
    });
    await manager.addEntry({
      title: 'Page B',
      path: 'wiki/page-b.md',
      pageType: 'concept',
      summary: 'Summary B',
    });

    const entries = await manager.read();
    expect(entries).toHaveLength(2);
    expect(entries[0].title).toBe('Page A');
    expect(entries[1].title).toBe('Page B');
  });
});
