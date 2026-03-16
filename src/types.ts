/** Normalized video job record returned by all video tools. */
export interface VideoJob {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  model: string;
  prompt: string;
  size: string;
  seconds: number;
  created_at: string;
  completed_at?: string;
  progress?: number;
  error?: { code: string; message: string };
  output_url?: string;
  output_expires_at?: string;
}

/** Downloadable video content with expiring URL. */
export interface VideoContent {
  url: string;
  content_type: string;
  expires_at: string;
}

/** Character asset for visual consistency across generations. */
export interface Character {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  file_id?: string;
}

/** Paginated list of video jobs. */
export interface VideoListResult {
  videos: VideoJob[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}
