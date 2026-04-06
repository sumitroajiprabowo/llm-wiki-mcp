import type { WikiManager } from "../core/wiki-manager.js";

interface UpdatePageInput {
  path: string;
  content: string;
}

export async function handleUpdatePage(
  input: UpdatePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; path: string; message: string }> {
  return wikiManager.updatePage(input.path, input.content);
}
