// tests/core/link-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { LinkResolver } from '../../src/core/link-resolver.js';

describe('LinkResolver — wikilink mode', () => {
  const resolver = new LinkResolver('wikilink', 'wiki');

  it('creates a simple wikilink', () => {
    expect(resolver.createLink('Transformer Architecture')).toBe('[[Transformer Architecture]]');
  });

  it('creates a wikilink with display text', () => {
    expect(resolver.createLink('Attention Is All You Need', 'Vaswani et al')).toBe(
      '[[Attention Is All You Need|Vaswani et al]]',
    );
  });

  it('parses wikilinks from content', () => {
    const content =
      'See [[Transformer Architecture]] and [[Attention Is All You Need|Vaswani et al]].';
    const links = resolver.parseLinks(content);
    expect(links).toEqual([
      {
        raw: '[[Transformer Architecture]]',
        target: 'Transformer Architecture',
        displayText: undefined,
      },
      {
        raw: '[[Attention Is All You Need|Vaswani et al]]',
        target: 'Attention Is All You Need',
        displayText: 'Vaswani et al',
      },
    ]);
  });
});

describe('LinkResolver — markdown mode', () => {
  const resolver = new LinkResolver('markdown', 'wiki');

  it('creates a markdown link', () => {
    expect(resolver.createLink('Transformer Architecture')).toBe(
      '[Transformer Architecture](wiki/transformer-architecture.md)',
    );
  });

  it('creates a markdown link with display text', () => {
    expect(resolver.createLink('Attention Is All You Need', 'Vaswani et al')).toBe(
      '[Vaswani et al](wiki/attention-is-all-you-need.md)',
    );
  });

  it('parses markdown links from content', () => {
    const content =
      'See [Transformer Architecture](wiki/transformer-architecture.md) and [Vaswani et al](wiki/attention-is-all-you-need.md).';
    const links = resolver.parseLinks(content);
    expect(links).toEqual([
      {
        raw: '[Transformer Architecture](wiki/transformer-architecture.md)',
        target: 'Transformer Architecture',
        displayText: undefined,
      },
      {
        raw: '[Vaswani et al](wiki/attention-is-all-you-need.md)',
        target: 'Vaswani et al',
        displayText: undefined,
      },
    ]);
  });
});

describe('slugify', () => {
  it('converts title to slug', () => {
    const resolver = new LinkResolver('markdown', 'wiki');
    expect(resolver.slugify('Transformer Architecture')).toBe('transformer-architecture');
    expect(resolver.slugify('Vaswani et al. (2017)')).toBe('vaswani-et-al-2017');
    expect(resolver.slugify('  Hello   World  ')).toBe('hello-world');
  });
});
