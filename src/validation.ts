import { z } from "zod";
import {
  getModelCapabilities,
  getSupportedModels,
  isValidSize,
  isValidDuration,
} from "./capabilities.js";
import { validationError, capabilityError, assetError } from "./errors.js";
import { resolve, normalize } from "node:path";
import { stat } from "node:fs/promises";

// ---------------------------------------------------------------------------
//  Imperative validation helpers (used by tools before calling OpenAI)
// ---------------------------------------------------------------------------

export function validateModel(model: string): void {
  const caps = getModelCapabilities(model);
  if (!caps) {
    throw validationError(
      `Unsupported model "${model}". Supported models: ${getSupportedModels().join(", ")}`,
      { supported_models: getSupportedModels() }
    );
  }
}

export function validateSize(model: string, size: string): void {
  if (!isValidSize(model, size)) {
    const caps = getModelCapabilities(model)!;
    throw capabilityError(
      `Size "${size}" is not supported for model "${model}". Allowed sizes: ${caps.sizes.join(", ")}`,
      { model, allowed_sizes: caps.sizes }
    );
  }
}

export function validateDuration(model: string, seconds: number): void {
  if (!isValidDuration(model, seconds)) {
    const caps = getModelCapabilities(model)!;
    throw capabilityError(
      `Duration ${seconds}s is not supported for model "${model}". Allowed durations (seconds): ${caps.durations.join(", ")}`,
      { model, allowed_durations: caps.durations }
    );
  }
}

export function validateEditSupport(model: string): void {
  const caps = getModelCapabilities(model);
  if (!caps?.supportsEdit) {
    throw capabilityError(
      `Model "${model}" does not support video editing.`,
      { model }
    );
  }
}

export function validateExtendSupport(model: string): void {
  const caps = getModelCapabilities(model);
  if (!caps?.supportsExtend) {
    throw capabilityError(
      `Model "${model}" does not support video extension.`,
      { model }
    );
  }
}

export function validateRemixSupport(model: string): void {
  const caps = getModelCapabilities(model);
  if (!caps?.supportsRemix) {
    throw capabilityError(
      `Model "${model}" does not support remix. Use sora_edit_video instead.`,
      { model }
    );
  }
}

export function validateCharacterSupport(
  model: string,
  count: number
): void {
  const caps = getModelCapabilities(model);
  if (!caps?.supportsCharacters) {
    throw capabilityError(
      `Model "${model}" does not support characters.`,
      { model }
    );
  }
  if (count > caps.maxCharacters) {
    throw capabilityError(
      `Model "${model}" supports at most ${caps.maxCharacters} characters per request. Got ${count}.`,
      { model, max: caps.maxCharacters, requested: count }
    );
  }
}

export function validateImageReferenceSupport(model: string): void {
  const caps = getModelCapabilities(model);
  if (!caps?.supportsImageReference) {
    throw capabilityError(
      `Model "${model}" does not support image references.`,
      { model }
    );
  }
}

/**
 * Validate and resolve a local file path against allowed upload directories.
 * Returns the resolved absolute path if valid.
 */
export function validateFilePath(
  filePath: string,
  allowedDirs: string[]
): string {
  const resolved = resolve(filePath);
  const normalized = normalize(resolved);

  const isAllowed = allowedDirs.some((dir) => {
    const normalizedDir = normalize(resolve(dir));
    return (
      normalized.startsWith(normalizedDir + "/") ||
      normalized === normalizedDir
    );
  });

  if (!isAllowed) {
    throw validationError(
      `File path "${filePath}" is outside allowed upload directories. Allowed: ${allowedDirs.join(", ")}`,
      { allowed_dirs: allowedDirs }
    );
  }

  return resolved;
}

const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);

/** Validate that a file exists and has an allowed video extension. */
export async function validateVideoFile(
  filePath: string,
  allowedDirs: string[]
): Promise<string> {
  const resolved = validateFilePath(filePath, allowedDirs);

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) {
      throw assetError(`Path "${filePath}" is not a regular file.`);
    }
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      throw assetError(`File not found: "${filePath}"`);
    }
    throw err;
  }

  const ext = resolved.slice(resolved.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
    throw assetError(
      `Unsupported file type "${ext}". Allowed: ${[...ALLOWED_VIDEO_EXTENSIONS].join(", ")}`,
      { allowed_extensions: [...ALLOWED_VIDEO_EXTENSIONS] }
    );
  }

  return resolved;
}

// ---------------------------------------------------------------------------
//  Zod schemas for MCP tool parameters
// ---------------------------------------------------------------------------

export const CreateVideoSchema = {
  model: z
    .string()
    .optional()
    .describe("Model to use: sora-2 or sora-2-pro. Defaults to server config."),
  prompt: z
    .string()
    .min(1)
    .describe(
      "Video generation prompt. Write it like a cinematography brief: subject, action, environment, camera, lighting, style."
    ),
  size: z
    .string()
    .optional()
    .describe(
      "Video resolution, e.g. 1920x1080, 1080x1920, 1080x1080. Defaults to 1920x1080."
    ),
  seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Video duration in seconds (e.g. 5, 10, 15, 20). Defaults to 10."),
  input_reference: z
    .object({
      type: z
        .enum(["image_url", "file_id"])
        .describe("Type of input reference"),
      url: z
        .string()
        .optional()
        .describe("Image URL (when type=image_url)"),
      file_id: z
        .string()
        .optional()
        .describe("Uploaded file ID (when type=file_id)"),
    })
    .optional()
    .describe(
      "Optional image reference to guide the opening frame or look. Different from characters — this sets the visual starting point for a single generation."
    ),
  characters: z
    .array(
      z.object({
        id: z.string().describe("Character asset ID from sora_create_character"),
        name: z
          .string()
          .describe(
            "Character name — must also appear in the prompt text for best consistency"
          ),
      })
    )
    .optional()
    .describe(
      "Reusable character assets for visual consistency across multiple generations. Create characters first with sora_create_character."
    ),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Optional key-value metadata tags for your own tracking."),
};

export const GetVideoSchema = {
  video_id: z
    .string()
    .min(1)
    .describe("The video job ID to retrieve."),
};

export const ListVideosSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of videos to return (1–100). Defaults to 20."),
  after: z
    .string()
    .optional()
    .describe("Pagination cursor: return videos after this ID."),
  model: z
    .string()
    .optional()
    .describe("Filter by model name (e.g. sora-2)."),
  status: z
    .enum(["queued", "in_progress", "completed", "failed"])
    .optional()
    .describe("Filter by job status."),
};

export const DownloadVideoSchema = {
  video_id: z
    .string()
    .min(1)
    .describe(
      "ID of the completed video to download. Video must have status 'completed'."
    ),
};

export const EditVideoSchema = {
  model: z
    .string()
    .optional()
    .describe("Model to use for the edit. Defaults to server config."),
  source_video_id: z
    .string()
    .min(1)
    .describe("ID of the source video to edit."),
  prompt: z
    .string()
    .min(1)
    .describe("Editing prompt describing the desired changes to the source video."),
  size: z
    .string()
    .optional()
    .describe("Output resolution. Defaults to source video size."),
  seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Output duration in seconds."),
  characters: z
    .array(
      z.object({
        id: z.string().describe("Character asset ID"),
        name: z.string().describe("Character name"),
      })
    )
    .optional()
    .describe("Characters to include in the edited video."),
};

export const ExtendVideoSchema = {
  model: z
    .string()
    .optional()
    .describe("Model to use for the extension. Defaults to server config."),
  video_id: z
    .string()
    .min(1)
    .describe("ID of the completed video to extend."),
  prompt: z
    .string()
    .min(1)
    .describe(
      "Prompt for the extension segment. Describe what should happen after the original clip ends."
    ),
  seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Duration of the extension in seconds."),
};

export const CreateCharacterSchema = {
  name: z
    .string()
    .min(1)
    .describe(
      "Character name. Use this exact name in generation prompts for consistency."
    ),
  file_path: z
    .string()
    .optional()
    .describe(
      "Local file path of a short video clip of the character. Must be in an allowed upload directory."
    ),
  file_id: z
    .string()
    .optional()
    .describe("Previously uploaded file ID to use as the character source."),
  description: z
    .string()
    .optional()
    .describe("Description of the character for your own reference."),
};

export const GetCharacterSchema = {
  character_id: z
    .string()
    .min(1)
    .describe("Character asset ID to retrieve."),
};

export const WaitForVideoSchema = {
  video_id: z
    .string()
    .min(1)
    .describe("Video job ID to poll until completion."),
  poll_interval_ms: z
    .number()
    .int()
    .min(1000)
    .max(60000)
    .optional()
    .describe(
      "Polling interval in milliseconds (1000–60000). Default: 5000."
    ),
  max_wait_seconds: z
    .number()
    .int()
    .min(10)
    .max(600)
    .optional()
    .describe(
      "Maximum time to wait in seconds (10–600). Default: 300."
    ),
};

export const RemixVideoSchema = {
  model: z.string().optional().describe("Model to use."),
  source_video_id: z
    .string()
    .min(1)
    .describe("Source video ID to remix."),
  prompt: z.string().min(1).describe("Remix prompt."),
  size: z.string().optional().describe("Output resolution."),
  seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Output duration in seconds."),
};

export const HelpPromptSchema = {
  idea: z
    .string()
    .min(1)
    .describe("Rough idea or concept for the video."),
  style: z
    .string()
    .optional()
    .describe(
      "Desired visual style (e.g. cinematic, animated, documentary, photorealistic)."
    ),
  duration_hint: z
    .string()
    .optional()
    .describe("Approximate duration hint (e.g. 'short 5s clip', 'longer 20s sequence')."),
  constraints: z
    .array(z.string())
    .optional()
    .describe(
      "Constraints like 'no text', 'single take', 'locked camera', 'product centered'."
    ),
};
