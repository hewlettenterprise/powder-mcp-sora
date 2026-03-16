export type ErrorCategory =
  | "ValidationError"
  | "CapabilityError"
  | "OpenAIAPIError"
  | "RateLimitError"
  | "AssetError"
  | "TimeoutError"
  | "NotFoundError";

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    category: ErrorCategory,
    message: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.category = category;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.name = category;
  }
}

export function validationError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("ValidationError", message, {
    statusCode: 400,
    details,
  });
}

export function capabilityError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("CapabilityError", message, {
    statusCode: 400,
    details,
  });
}

export function openaiApiError(
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>
): AppError {
  return new AppError("OpenAIAPIError", message, { statusCode, details });
}

export function rateLimitError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("RateLimitError", message, {
    statusCode: 429,
    details,
  });
}

export function assetError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("AssetError", message, { statusCode: 400, details });
}

export function timeoutError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("TimeoutError", message, { statusCode: 408, details });
}

export function notFoundError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError("NotFoundError", message, { statusCode: 404, details });
}

/** Format any error into an MCP-friendly content array. */
export function formatErrorForMcp(
  err: unknown
): { type: "text"; text: string }[] {
  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      error: true,
      category: err.category,
      message: err.message,
    };
    if (err.details) payload.details = err.details;
    return [{ type: "text", text: JSON.stringify(payload, null, 2) }];
  }
  const message = err instanceof Error ? err.message : String(err);
  return [
    {
      type: "text",
      text: JSON.stringify(
        { error: true, category: "UnknownError", message },
        null,
        2
      ),
    },
  ];
}
