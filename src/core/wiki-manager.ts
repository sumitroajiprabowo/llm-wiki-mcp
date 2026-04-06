// src/core/wiki-manager.ts
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { WikiSchema, PageData } from '../config/types.js';
import type { LinkResolver } from './link-resolver.js';
import type { IndexManager } from './index-manager.js';
import type { LogManager } from './log-manager.js';
import { safePath } from '../utils/safe-path.js';

export class WikiManager {
  private wikiAbsDir: string;

  constructor(
    private vaultPath: string,
    private schema: WikiSchema,
    private linkResolver: LinkResolver,
    private indexManager: IndexManager,
    private logManager: LogManager,
  ) {
    this.wikiAbsDir = join(vaultPath, schema.paths.wiki);
  }

  async createPage(
    title: string,
    content: string,
    pageType?: string,
  ): Promise<{ success: boolean; path: string; message: string }> {
    const slug = this.linkResolver.slugify(title);
    const relativePath = `${this.schema.paths.wiki}/${slug}.md`;
    const absPath = join(this.vaultPath, relativePath);

    if (existsSync(absPath)) {
      return {
        success: false,
        path: relativePath,
        message: `Page already exists: ${relativePath}`,
      };
    }

    writeFileSync(absPath, content, 'utf-8');

    const parsed = matter(content);
    const summary = this.extractSummary(parsed.content);

    await this.indexManager.addEntry({
      title,
      path: relativePath,
      pageType: pageType ?? (parsed.data.type as string) ?? 'other',
      summary,
    });

    const today = new Date().toISOString().slice(0, 10);
    await this.logManager.append({
      date: today,
      operation: 'create',
      title,
      details: `Created: ${relativePath}`,
    });

    return { success: true, path: relativePath, message: `Created: ${relativePath}` };
  }

  async readPage(lookup: { title?: string; path?: string }): Promise<PageData> {
    let absPath: string;
    let relativePath: string;

    if (lookup.path) {
      relativePath = lookup.path;
      absPath = safePath(this.vaultPath, relativePath);
    } else if (lookup.title) {
      const slug = this.linkResolver.slugify(lookup.title);
      relativePath = `${this.schema.paths.wiki}/${slug}.md`;
      absPath = safePath(this.vaultPath, relativePath);
    } else {
      throw new Error('Either title or path must be provided');
    }

    if (!existsSync(absPath)) {
      throw new Error(`Page not found: ${relativePath}`);
    }

    const raw = readFileSync(absPath, 'utf-8');
    const parsed = matter(raw);

    return {
      content: raw,
      frontmatter: parsed.data as Record<string, unknown>,
      path: relativePath,
    };
  }

  async updatePage(
    path: string,
    content: string,
  ): Promise<{ success: boolean; path: string; message: string }> {
    const absPath = safePath(this.vaultPath, path);

    if (!existsSync(absPath)) {
      return { success: false, path, message: `Page not found: ${path}` };
    }

    writeFileSync(absPath, content, 'utf-8');

    const parsed = matter(content);
    const title = (parsed.data.title as string) ?? path;
    const today = new Date().toISOString().slice(0, 10);

    await this.logManager.append({
      date: today,
      operation: 'update',
      title,
      details: `Updated: ${path}`,
    });

    return { success: true, path, message: `Updated: ${path}` };
  }

  async deletePage(
    path: string,
  ): Promise<{ success: boolean; message: string; brokenLinks: string[] }> {
    const absPath = safePath(this.vaultPath, path);

    if (!existsSync(absPath)) {
      return { success: false, message: `Page not found: ${path}`, brokenLinks: [] };
    }

    const raw = readFileSync(absPath, 'utf-8');
    const parsed = matter(raw);
    const title = (parsed.data.title as string) ?? path;

    const brokenLinks = this.findBacklinks(title);

    unlinkSync(absPath);
    await this.indexManager.removeEntry(path);

    const today = new Date().toISOString().slice(0, 10);
    await this.logManager.append({
      date: today,
      operation: 'delete',
      title,
      details: `Deleted: ${path}. Broken links in: ${brokenLinks.join(', ') || 'none'}`,
    });

    return { success: true, message: `Deleted: ${path}`, brokenLinks };
  }

  private findBacklinks(title: string): string[] {
    const backlinks: string[] = [];
    const files = this.listWikiFiles();

    for (const file of files) {
      const absPath = join(this.vaultPath, file);
      const content = readFileSync(absPath, 'utf-8');
      const links = this.linkResolver.parseLinks(content);
      if (links.some((l) => l.target === title)) {
        backlinks.push(file);
      }
    }

    return backlinks;
  }

  listWikiFiles(): string[] {
    if (!existsSync(this.wikiAbsDir)) return [];

    return readdirSync(this.wikiAbsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `${this.schema.paths.wiki}/${f}`);
  }

  private extractSummary(content: string): string {
    const lines = content.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.slice(0, 120);
      }
    }
    return '';
  }
}
