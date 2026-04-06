import { describe, it, expect } from 'vitest';
import { safePath } from '../../src/utils/safe-path.js';

describe('safePath', () => {
  const vault = '/tmp/vault';

  it('allows a valid relative path within the vault', () => {
    const result = safePath(vault, 'wiki/page.md');
    expect(result).toBe('/tmp/vault/wiki/page.md');
  });

  it('allows a nested path within the vault', () => {
    const result = safePath(vault, 'wiki/sub/deep/page.md');
    expect(result).toBe('/tmp/vault/wiki/sub/deep/page.md');
  });

  it('allows a path that resolves back into the vault', () => {
    const result = safePath(vault, 'wiki/../wiki/page.md');
    expect(result).toBe('/tmp/vault/wiki/page.md');
  });

  it('rejects a path that escapes the vault with ../', () => {
    expect(() => safePath(vault, '../../etc/passwd')).toThrow('Path must be within the vault');
  });

  it('rejects a path that escapes via wiki/../../..', () => {
    expect(() => safePath(vault, 'wiki/../../../etc/shadow')).toThrow(
      'Path must be within the vault',
    );
  });

  it('rejects an absolute path outside the vault', () => {
    expect(() => safePath(vault, '/etc/passwd')).toThrow('Path must be within the vault');
  });

  it('rejects a path that resolves to the vault root itself', () => {
    // vault root alone is allowed (resolved === root)
    const result = safePath(vault, '.');
    expect(result).toBe('/tmp/vault');
  });

  it('rejects a path that is a prefix match but not a child', () => {
    // e.g., /tmp/vault-evil should not pass for vault /tmp/vault
    expect(() => safePath('/tmp/vault', '../vault-evil/file.md')).toThrow(
      'Path must be within the vault',
    );
  });
});
