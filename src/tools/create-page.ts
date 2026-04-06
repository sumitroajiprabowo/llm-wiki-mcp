import type { WikiManager } from "../core/wiki-manager.js";

interface CreatePageInput {
  title: string;
  content: string;
  pageType?: string;
}

export async function handleCreatePage(
  input: CreatePageInput,
  wikiManager: WikiManager
): Promise<{ success: boolean; path: string; message: string }> {
  return wikiManager.createPage(input.title, input.content, input.pageType);
}
