// src/core/log-manager.ts
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { LogEntry, LogFilter } from "../config/types.js";

const LOG_HEADER = "# Wiki Log\n";
const ENTRY_REGEX = /^## \[(\d{4}-\d{2}-\d{2})\] (\w+) \| (.+)$/;

export class LogManager {
  private logPath: string;

  constructor(vaultPath: string) {
    this.logPath = join(vaultPath, "log.md");
  }

  async append(entry: LogEntry): Promise<void> {
    if (!existsSync(this.logPath)) {
      writeFileSync(this.logPath, LOG_HEADER + "\n", "utf-8");
    }

    let block = `\n## [${entry.date}] ${entry.operation} | ${entry.title}\n`;
    if (entry.details) {
      block += `${entry.details}\n`;
    }

    appendFileSync(this.logPath, block, "utf-8");
  }

  async read(filter?: LogFilter): Promise<LogEntry[]> {
    if (!existsSync(this.logPath)) {
      return [];
    }

    const content = readFileSync(this.logPath, "utf-8");
    const lines = content.split("\n");
    const entries: LogEntry[] = [];
    let current: LogEntry | null = null;
    const detailLines: string[] = [];

    const flushCurrent = () => {
      if (current) {
        if (detailLines.length > 0) {
          current.details = detailLines.join("\n").trim() || undefined;
        }
        entries.push(current);
        detailLines.length = 0;
      }
    };

    for (const line of lines) {
      const match = line.match(ENTRY_REGEX);
      if (match) {
        flushCurrent();
        current = {
          date: match[1],
          operation: match[2],
          title: match[3],
        };
      } else if (current && line.trim() !== "" && !line.startsWith("# ")) {
        detailLines.push(line);
      }
    }
    flushCurrent();

    let result = entries;

    if (filter?.operation) {
      result = result.filter((e) => e.operation === filter.operation);
    }
    if (filter?.since) {
      result = result.filter((e) => e.date >= filter.since!);
    }
    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }
}
