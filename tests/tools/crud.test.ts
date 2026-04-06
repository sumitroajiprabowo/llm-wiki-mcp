import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleCreatePage } from "../../src/tools/create-page.js";
import { handleReadPage } from "../../src/tools/read-page.js";
import { handleUpdatePage } from "../../src/tools/update-page.js";
import { handleDeletePage } from "../../src/tools/delete-page.js";
import { WikiManager } from "../../src/core/wiki-manager.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { IndexManager } from "../../src/core/index-manager.js";
import { LogManager } from "../../src/core/log-manager.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/crud-test");

function createServices() {
  const linkResolver = new LinkResolver("wikilink", "wiki");
  const indexManager = new IndexManager(TEST_DIR, linkResolver);
  const logManager = new LogManager(TEST_DIR);
  const wikiManager = new WikiManager(TEST_DIR, DEFAULT_SCHEMA, linkResolver, indexManager, logManager);
  return { wikiManager };
}

beforeEach(() => { mkdirSync(join(TEST_DIR, "wiki"), { recursive: true }); });
afterEach(() => { rmSync(TEST_DIR, { recursive: true, force: true }); });

describe("CRUD tools", () => {
  it("create → read → update → delete lifecycle", async () => {
    const { wikiManager } = createServices();
    const createResult = await handleCreatePage(
      { title: "Test Page", content: "---\ntitle: Test Page\ntype: concept\ntags: []\ncreated: 2026-04-06\n---\n\n# Test Page\n\nHello.", pageType: "concept" },
      wikiManager
    );
    expect(createResult.success).toBe(true);
    expect(createResult.path).toBe("wiki/test-page.md");

    const readResult = await handleReadPage({ title: "Test Page" }, wikiManager);
    expect(readResult.content).toContain("Hello.");
    expect(readResult.frontmatter.title).toBe("Test Page");

    const updateResult = await handleUpdatePage(
      { path: "wiki/test-page.md", content: "---\ntitle: Test Page\ntype: concept\ntags: [updated]\ncreated: 2026-04-06\nupdated: 2026-04-06\n---\n\n# Test Page\n\nUpdated." },
      wikiManager
    );
    expect(updateResult.success).toBe(true);

    const readAgain = await handleReadPage({ path: "wiki/test-page.md" }, wikiManager);
    expect(readAgain.content).toContain("Updated.");

    const deleteResult = await handleDeletePage({ path: "wiki/test-page.md" }, wikiManager);
    expect(deleteResult.success).toBe(true);
  });
});
