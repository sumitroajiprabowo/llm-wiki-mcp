import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleLint } from "../../src/tools/lint.js";
import { LinkResolver } from "../../src/core/link-resolver.js";
import { DEFAULT_SCHEMA } from "../../src/config/types.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/lint-test");
const WIKI_DIR = join(TEST_DIR, "wiki");

beforeEach(() => { mkdirSync(WIKI_DIR, { recursive: true }); });
afterEach(() => { rmSync(TEST_DIR, { recursive: true, force: true }); });

describe("wiki_lint handler", () => {
  it("detects orphan pages (no inbound links)", async () => {
    writeFileSync(join(WIKI_DIR, "page-a.md"), "---\ntitle: Page A\ntype: concept\n---\n\nSee [[Page B]].", "utf-8");
    writeFileSync(join(WIKI_DIR, "page-b.md"), "---\ntitle: Page B\ntype: concept\n---\n\nLinked from A.", "utf-8");
    writeFileSync(join(WIKI_DIR, "page-c.md"), "---\ntitle: Page C\ntype: concept\n---\n\nAll alone.", "utf-8");

    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);
    expect(result.orphan_pages).toContain("wiki/page-a.md");
    expect(result.orphan_pages).toContain("wiki/page-c.md");
    expect(result.orphan_pages).not.toContain("wiki/page-b.md");
  });

  it("detects broken links", async () => {
    writeFileSync(join(WIKI_DIR, "linker.md"), "---\ntitle: Linker\ntype: concept\n---\n\nSee [[Nonexistent Page]].", "utf-8");
    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);
    expect(result.broken_links).toContainEqual({ from: "wiki/linker.md", to: "Nonexistent Page" });
  });

  it("detects pages without frontmatter", async () => {
    writeFileSync(join(WIKI_DIR, "no-fm.md"), "# No Frontmatter\n\nJust content.", "utf-8");
    const linkResolver = new LinkResolver("wikilink", "wiki");
    const result = await handleLint({ scope: "full" }, TEST_DIR, DEFAULT_SCHEMA, linkResolver);
    expect(result.pages_without_frontmatter).toContain("wiki/no-fm.md");
  });
});
