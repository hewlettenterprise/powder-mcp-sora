#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx = createServer(config);

  if (config.transport === "http") {
    const { startHttpServer } = await import("./http-server.js");
    await startHttpServer(ctx, config);
  } else {
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const transport = new StdioServerTransport();
    await ctx.server.connect(transport);
  }
}

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      msg: "fatal_startup_error",
      data: { error: err instanceof Error ? err.message : String(err) },
    }) + "\n"
  );
  process.exit(1);
});
