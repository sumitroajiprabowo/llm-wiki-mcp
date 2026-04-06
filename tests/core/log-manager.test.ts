// tests/core/log-manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LogManager } from "../../src/core/log-manager.js";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "../fixtures/log-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("LogManager", () => {
  it("creates log.md and appends an entry", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({
      date: "2026-04-06",
      operation: "init",
      title: "My Wiki",
      details: "Vault initialized.",
    });

    const content = readFileSync(join(TEST_DIR, "log.md"), "utf-8");
    expect(content).toContain("# Wiki Log");
    expect(content).toContain("## [2026-04-06] init | My Wiki");
    expect(content).toContain("Vault initialized.");
  });

  it("appends multiple entries in order", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({
      date: "2026-04-06",
      operation: "init",
      title: "My Wiki",
    });
    await manager.append({
      date: "2026-04-06",
      operation: "create",
      title: "Test Page",
      details: "New page created.",
    });

    const content = readFileSync(join(TEST_DIR, "log.md"), "utf-8");
    const initPos = content.indexOf("init | My Wiki");
    const createPos = content.indexOf("create | Test Page");
    expect(initPos).toBeLessThan(createPos);
  });

  it("reads entries with filter", async () => {
    const manager = new LogManager(TEST_DIR);
    await manager.append({ date: "2026-04-05", operation: "init", title: "Wiki" });
    await manager.append({ date: "2026-04-06", operation: "create", title: "Page A" });
    await manager.append({ date: "2026-04-06", operation: "ingest", title: "Source B" });

    const all = await manager.read();
    expect(all).toHaveLength(3);

    const creates = await manager.read({ operation: "create" });
    expect(creates).toHaveLength(1);
    expect(creates[0].title).toBe("Page A");

    const recent = await manager.read({ since: "2026-04-06" });
    expect(recent).toHaveLength(2);

    const limited = await manager.read({ limit: 1 });
    expect(limited).toHaveLength(1);
  });
});
