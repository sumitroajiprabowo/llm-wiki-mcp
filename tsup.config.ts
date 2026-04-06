import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { server: "src/server.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    target: "node18",
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node18",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
