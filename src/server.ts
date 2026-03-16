import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { Logger } from "./logger.js";
import { OpenAIClient } from "./openai-client.js";
import { registerAllTools } from "./tools/index.js";

/** Create and configure the MCP server with all Sora 2 tools. */
export function createServer(config: Config): McpServer {
  const logger = new Logger(config);
  const client = new OpenAIClient(config, logger);

  const server = new McpServer({
    name: "powder-mcp-sora",
    version: "1.0.0",
  });

  registerAllTools(server, client, config, logger);

  logger.info("server_created", {
    defaultModel: config.defaultModel,
    debug: config.debug,
  });

  return server;
}
