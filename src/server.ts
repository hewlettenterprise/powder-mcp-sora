import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { Logger } from "./logger.js";
import { OpenAIClient } from "./openai-client.js";
import { registerAllTools } from "./tools/index.js";

export interface ServerContext {
  server: McpServer;
  logger: Logger;
  /** Default client (stdio mode) or null (HTTP mode with per-session keys). */
  defaultClient: OpenAIClient | null;
}

/** Create and configure the MCP server with all Sora 2 tools. */
export function createServer(config: Config): ServerContext {
  const logger = new Logger(config);

  // In stdio mode, build a single client at startup.
  // In HTTP mode, clients are created per-session — defaultClient is null.
  const defaultClient = config.openaiApiKey
    ? new OpenAIClient(
        { ...config, openaiApiKey: config.openaiApiKey },
        logger
      )
    : null;

  const server = new McpServer({
    name: "powder-mcp-sora",
    version: "1.0.0",
  });

  registerAllTools(server, defaultClient, config, logger);

  logger.info("server_created", {
    transport: config.transport,
    defaultModel: config.defaultModel,
    debug: config.debug,
    hasDefaultClient: defaultClient !== null,
  });

  return { server, logger, defaultClient };
}
