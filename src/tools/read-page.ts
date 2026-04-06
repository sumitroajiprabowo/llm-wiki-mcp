import type { WikiManager } from "../core/wiki-manager.js";
import type { PageData } from "../config/types.js";

interface ReadPageInput {
  title?: string;
  path?: string;
}

export async function handleReadPage(
  input: ReadPageInput,
  wikiManager: WikiManager
): Promise<PageData> {
  return wikiManager.readPage(input);
}
