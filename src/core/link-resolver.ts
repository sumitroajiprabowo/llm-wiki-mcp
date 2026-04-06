// src/core/link-resolver.ts
import type { ParsedLink } from '../config/types.js';

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const MDLINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

export class LinkResolver {
  constructor(
    private linkStyle: 'wikilink' | 'markdown',
    private wikiDir: string,
  ) {}

  slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  createLink(targetTitle: string, displayText?: string): string {
    if (this.linkStyle === 'wikilink') {
      if (displayText) {
        return `[[${targetTitle}|${displayText}]]`;
      }
      return `[[${targetTitle}]]`;
    }

    const slug = this.slugify(targetTitle);
    const path = `${this.wikiDir}/${slug}.md`;
    const text = displayText ?? targetTitle;
    return `[${text}](${path})`;
  }

  parseLinks(content: string): ParsedLink[] {
    const links: ParsedLink[] = [];

    if (this.linkStyle === 'wikilink') {
      let match: RegExpExecArray | null;
      const regex = new RegExp(WIKILINK_REGEX.source, 'g');
      while ((match = regex.exec(content)) !== null) {
        links.push({
          raw: match[0],
          target: match[1],
          displayText: match[2] ?? undefined,
        });
      }
    } else {
      let match: RegExpExecArray | null;
      const regex = new RegExp(MDLINK_REGEX.source, 'g');
      while ((match = regex.exec(content)) !== null) {
        links.push({
          raw: match[0],
          target: match[1],
          displayText: undefined,
        });
      }
    }

    return links;
  }
}
