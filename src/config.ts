export type TransportMode = "stdio" | "http";

export interface Config {
  transport: TransportMode;
  openaiApiKey: string | null;
  openaiBaseUrl: string;
  defaultModel: string;
  maxPollSeconds: number;
  pollIntervalMs: number;
  debug: boolean;
  allowedUploadDirs: string[];
  httpPort: number;
  httpHost: string;
}

export function loadConfig(): Config {
  const transport = (process.env.MCP_TRANSPORT ?? "stdio") as TransportMode;
  if (transport !== "stdio" && transport !== "http") {
    throw new Error(
      `Invalid MCP_TRANSPORT "${transport}". Must be "stdio" or "http".`
    );
  }

  const apiKey = process.env.OPENAI_API_KEY ?? null;

  // In stdio mode, the API key is required at startup.
  // In HTTP mode, clients can provide their own key per session.
  if (transport === "stdio" && !apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required in stdio mode. " +
        "Set it in your environment or .env file before starting the server."
    );
  }

  return {
    transport,
    openaiApiKey: apiKey,
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    defaultModel: process.env.SORA_DEFAULT_MODEL ?? "sora-2",
    maxPollSeconds: parseInt(process.env.SORA_MAX_POLL_SECONDS ?? "300", 10),
    pollIntervalMs: parseInt(process.env.SORA_POLL_INTERVAL_MS ?? "5000", 10),
    debug: process.env.SORA_DEBUG === "true",
    allowedUploadDirs: (process.env.SORA_ALLOWED_UPLOAD_DIRS ?? "/tmp")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
    httpPort: parseInt(process.env.MCP_HTTP_PORT ?? "3000", 10),
    httpHost: process.env.MCP_HTTP_HOST ?? "127.0.0.1",
  };
}
