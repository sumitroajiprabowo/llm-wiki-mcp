import type { WikiManager } from "../core/wiki-manager.js";

interface DeletePageInput {
  path: string;
}

export async function handleDeletePage(
  input: DeletePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; message: string; brokenLinks: string[] }> {
  return wikiManager.deletePage(input.path);
}
