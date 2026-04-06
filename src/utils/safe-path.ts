import { resolve } from 'node:path';

/**
 * Validates that a resolved path stays within the vault root directory.
 * Prevents path traversal attacks (e.g., `../../etc/passwd`).
 *
 * @param vaultPath - The absolute path to the vault root
 * @param userPath - The user-supplied relative path
 * @returns The resolved absolute path
 * @throws Error if the resolved path escapes the vault root
 */
export function safePath(vaultPath: string, userPath: string): string {
  const root = resolve(vaultPath);
  const resolved = resolve(root, userPath);

  if (!resolved.startsWith(root + '/') && resolved !== root) {
    throw new Error('Path must be within the vault');
  }

  return resolved;
}
