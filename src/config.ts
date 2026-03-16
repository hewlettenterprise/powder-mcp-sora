export interface Config {
  openaiApiKey: string;
  openaiBaseUrl: string;
  defaultModel: string;
  maxPollSeconds: number;
  pollIntervalMs: number;
  debug: boolean;
  allowedUploadDirs: string[];
}

export function loadConfig(): Config {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. " +
        "Set it in your environment or .env file before starting the server."
    );
  }

  return {
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
  };
}
