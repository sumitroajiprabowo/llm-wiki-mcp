import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleIngest } from '../../src/tools/ingest.js';
import { handleReadPage } from '../../src/tools/read-page.js';
import { handleUpdatePage } from '../../src/tools/update-page.js';
import { handleDeletePage } from '../../src/tools/delete-page.js';
import { WikiManager } from '../../src/core/wiki-manager.js';
import { LinkResolver } from '../../src/core/link-resolver.js';
import { IndexManager } from '../../src/core/index-manager.js';
import { LogManager } from '../../src/core/log-manager.js';
import { DEFAULT_SCHEMA } from '../../src/config/types.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/traversal-test');

function createServices() {
  const linkResolver = new LinkResolver('wikilink', 'wiki');
  const indexManager = new IndexManager(TEST_DIR, linkResolver);
  const logManager = new LogManager(TEST_DIR);
  const wikiManager = new WikiManager(
    TEST_DIR,
    DEFAULT_SCHEMA,
    linkResolver,
    indexManager,
    logManager,
  );
  return { wikiManager };
}

beforeEach(() => {
  mkdirSync(join(TEST_DIR, 'wiki'), { recursive: true });
});
afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('path traversal protection', () => {
  it('ingest rejects traversal in source_path', async () => {
    await expect(
      handleIngest({ source_path: '../../etc/passwd' }, TEST_DIR, DEFAULT_SCHEMA),
    ).rejects.toThrow('Path must be within the vault');
  });

  it('read-page rejects traversal in path', async () => {
    const { wikiManager } = createServices();
    await expect(handleReadPage({ path: '../../etc/passwd' }, wikiManager)).rejects.toThrow(
      'Path must be within the vault',
    );
  });

  it('update-page rejects traversal in path', async () => {
    const { wikiManager } = createServices();
    await expect(
      handleUpdatePage({ path: '../../etc/passwd', content: 'malicious' }, wikiManager),
    ).rejects.toThrow('Path must be within the vault');
  });

  it('delete-page rejects traversal in path', async () => {
    const { wikiManager } = createServices();
    await expect(handleDeletePage({ path: '../../etc/passwd' }, wikiManager)).rejects.toThrow(
      'Path must be within the vault',
    );
  });

  it('rejects absolute path outside vault', async () => {
    const { wikiManager } = createServices();
    await expect(handleReadPage({ path: '/etc/passwd' }, wikiManager)).rejects.toThrow(
      'Path must be within the vault',
    );
  });
});
