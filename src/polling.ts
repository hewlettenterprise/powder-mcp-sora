import type { VideoJob } from "./types.js";
import type { OpenAIClient } from "./openai-client.js";
import type { Logger } from "./logger.js";
import { timeoutError } from "./errors.js";

export interface PollOptions {
  videoId: string;
  pollIntervalMs: number;
  maxWaitSeconds: number;
}

/**
 * Poll a video job until it reaches a terminal status (completed | failed)
 * or the maximum wait time is exceeded.
 */
export async function pollUntilComplete(
  client: OpenAIClient,
  logger: Logger,
  options: PollOptions
): Promise<VideoJob> {
  const { videoId, pollIntervalMs, maxWaitSeconds } = options;
  const deadline = Date.now() + maxWaitSeconds * 1000;

  logger.info("poll_start", { videoId, pollIntervalMs, maxWaitSeconds });

  while (Date.now() < deadline) {
    const job = await client.getVideo(videoId);

    if (job.status === "completed" || job.status === "failed") {
      logger.info("poll_terminal", { videoId, status: job.status });
      return job;
    }

    logger.debug("poll_tick", {
      videoId,
      status: job.status,
      progress: job.progress,
      remaining_ms: deadline - Date.now(),
    });

    await sleep(pollIntervalMs);
  }

  throw timeoutError(
    `Video ${videoId} did not reach a terminal status within ${maxWaitSeconds}s. ` +
      `Use sora_get_video to check the current status later.`,
    { videoId, maxWaitSeconds }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
