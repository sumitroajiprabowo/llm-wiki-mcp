// tests/core/wiki-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WikiManager } from '../../src/core/wiki-manager.js';
import { LinkResolver } from '../../src/core/link-resolver.js';
import { IndexManager } from '../../src/core/index-manager.js';
import { LogManager } from '../../src/core/log-manager.js';
import { DEFAULT_SCHEMA } from '../../src/config/types.js';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '../fixtures/wiki-test');

beforeEach(() => {
  mkdirSync(join(TEST_DIR, 'wiki'), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function createManager() {
  const linkResolver = new LinkResolver('wikilink', 'wiki');
  const indexManager = new IndexManager(TEST_DIR, linkResolver);
  const logManager = new LogManager(TEST_DIR);
  return new WikiManager(TEST_DIR, DEFAULT_SCHEMA, linkResolver, indexManager, logManager);
}

describe('WikiManager', () => {
  it('creates a page with frontmatter', async () => {
    const manager = createManager();
    const content = `---
title: Attention Mechanism
type: concept
tags: [deep-learning]
created: 2026-04-06
---

# Attention Mechanism

A core mechanism in transformers.`;

    const result = await manager.createPage('Attention Mechanism', content, 'concept');
    expect(result.success).toBe(true);
    expect(result.path).toBe('wiki/attention-mechanism.md');

    const filePath = join(TEST_DIR, 'wiki/attention-mechanism.md');
    expect(existsSync(filePath)).toBe(true);

    const saved = readFileSync(filePath, 'utf-8');
    expect(saved).toContain('# Attention Mechanism');
  });

  it('reads a page by path', async () => {
    const manager = createManager();
    const content = `---
title: Test Page
type: concept
tags: []
created: 2026-04-06
---

# Test Page

Content here.`;

    await manager.createPage('Test Page', content, 'concept');
    const page = await manager.readPage({ path: 'wiki/test-page.md' });
    expect(page.frontmatter.title).toBe('Test Page');
    expect(page.content).toContain('Content here.');
  });

  it('reads a page by title', async () => {
    const manager = createManager();
    const content = `---
title: Find Me
type: entity
tags: []
created: 2026-04-06
---

Found!`;

    await manager.createPage('Find Me', content, 'entity');
    const page = await manager.readPage({ title: 'Find Me' });
    expect(page.content).toContain('Found!');
  });

  it('updates a page', async () => {
    const manager = createManager();
    const original = `---
title: Mutable
type: concept
tags: []
created: 2026-04-06
---

Version 1.`;

    await manager.createPage('Mutable', original, 'concept');

    const updated = `---
title: Mutable
type: concept
tags: [updated]
created: 2026-04-06
updated: 2026-04-06
---

Version 2.`;

    const result = await manager.updatePage('wiki/mutable.md', updated);
    expect(result.success).toBe(true);

    const page = await manager.readPage({ path: 'wiki/mutable.md' });
    expect(page.content).toContain('Version 2.');
  });

  it('deletes a page and reports broken links', async () => {
    const manager = createManager();

    const pageA = `---
title: Page A
type: concept
tags: []
created: 2026-04-06
---

Links to [[Page B]].`;

    const pageB = `---
title: Page B
type: concept
tags: []
created: 2026-04-06
---

Standalone page.`;

    await manager.createPage('Page A', pageA, 'concept');
    await manager.createPage('Page B', pageB, 'concept');

    const result = await manager.deletePage('wiki/page-b.md');
    expect(result.success).toBe(true);
    expect(result.brokenLinks).toContain('wiki/page-a.md');
    expect(existsSync(join(TEST_DIR, 'wiki/page-b.md'))).toBe(false);
  });

  it('rejects duplicate page creation', async () => {
    const manager = createManager();
    const content = `---
title: Dup
type: concept
tags: []
created: 2026-04-06
---

Content.`;

    await manager.createPage('Dup', content, 'concept');
    const result = await manager.createPage('Dup', content, 'concept');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already exists');
  });
});
