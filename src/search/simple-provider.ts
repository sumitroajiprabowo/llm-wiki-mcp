import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { SearchResult, SearchOptions } from "../config/types.js";
import type { SearchProvider } from "./search-provider.js";

export class SimpleProvider implements SearchProvider {
  name = "simple";

  async available(): Promise<boolean> {
    return true;
  }

  async index(): Promise<void> {
    // no-op
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const { maxResults, wikiDir } = options;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) return [];

    const files = readdirSync(wikiDir).filter((f) => f.endsWith(".md"));
    const scored: SearchResult[] = [];

    for (const file of files) {
      const absPath = join(wikiDir, file);
      const raw = readFileSync(absPath, "utf-8");
      const parsed = matter(raw);
      const title = (parsed.data.title as string) ?? file.replace(".md", "");
      const body = parsed.content.toLowerCase();
      const titleLower = title.toLowerCase();

      let score = 0;
      let matchedSnippet = "";

      for (const term of terms) {
        if (titleLower.includes(term)) {
          score += 3;
        }

        const bodyMatches = body.split(term).length - 1;
        score += bodyMatches;

        if (!matchedSnippet && bodyMatches > 0) {
          const idx = body.indexOf(term);
          const start = Math.max(0, idx - 50);
          const end = Math.min(body.length, idx + term.length + 100);
          matchedSnippet = parsed.content.slice(start, end).trim();
        }
      }

      if (score > 0) {
        scored.push({
          path: file,
          title,
          snippet: matchedSnippet,
          score: Math.min(score / (terms.length * 5), 1),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }
}
