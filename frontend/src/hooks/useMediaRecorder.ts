import { useState, useRef, useCallback } from "react";

export type MediaRecorderStatus =
  | "idle"
  | "recording"
  | "recording_failed"
  | "stopped"
  | "unsupported";

export interface UseMediaRecorderResult {
  start: () => void;
  /** Stop and assemble a clipped blob.
   *  @param voteTimestampMs  epoch ms when the vote was cast; if provided the
   *                          hook clips to PRE_VOTE_MS before + POST_VOTE_MS after.
   *                          Pass undefined to assemble the full recording.
   *  @param discard          if true, stop without producing a blob (session expired).
   */
  stop: (voteTimestampMs?: number, discard?: boolean) => void;
  status: MediaRecorderStatus;
  blob: Blob | null;
}

// MIME type candidates in order of preference
const MIME_TYPE_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

// Rolling buffer window — keep the last N ms of chunks for clipping
const BUFFER_WINDOW_MS = 25_000; // 25 s rolling window is more than enough for 20 s clip

// Clip boundaries around vote event
const PRE_VOTE_MS  = 10_000; // 10 s before vote
const POST_VOTE_MS = 10_000; // 10 s after vote

function selectMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mimeType of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return null;
}

/**
 * Rolling-buffer MediaRecorder hook.
 *
 * Records in 500 ms timeslices. Each chunk is stored with its arrival
 * timestamp so that `stop(voteTimestampMs)` can clip the assembled blob to
 * [voteTimestamp - PRE_VOTE_MS, voteTimestamp + POST_VOTE_MS].
 *
 * When `stop(undefined, true)` is called (session expired, no vote cast),
 * the recording is discarded and `blob` remains null.
 */
export function useMediaRecorder(stream: MediaStream | null): UseMediaRecorderResult {
  const [status, setStatus] = useState<MediaRecorderStatus>(() =>
    selectMimeType() === null ? "unsupported" : "idle"
  );
  const [blob, setBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Each entry: { data: Blob, arrivedAt: number (epoch ms) }
  const chunksRef = useRef<{ data: Blob; arrivedAt: number }[]>([]);
  const mimeTypeRef = useRef<string>("");

  // Parameters captured at stop() time, read inside onstop callback
  const voteTimestampRef = useRef<number | undefined>(undefined);
  const discardRef = useRef<boolean>(false);

  const stop = useCallback(
    (voteTimestampMs?: number, discard = false) => {
      voteTimestampRef.current = voteTimestampMs;
      discardRef.current = discard;

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    },
    []
  );

  const start = useCallback(() => {
    if (!stream) return;

    const mimeType = selectMimeType();
    if (mimeType === null) {
      setStatus("unsupported");
      return;
    }

    mimeTypeRef.current = mimeType;
    chunksRef.current = [];
    setBlob(null);
    voteTimestampRef.current = undefined;
    discardRef.current = false;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      setStatus("recording_failed");
      return;
    }

    mediaRecorderRef.current = recorder;

    // Collect timestamped chunks; prune the rolling buffer to BUFFER_WINDOW_MS
    recorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data || event.data.size === 0) return;
      const now = Date.now();
      chunksRef.current.push({ data: event.data, arrivedAt: now });

      // Prune old chunks outside the rolling window
      const cutoff = now - BUFFER_WINDOW_MS;
      chunksRef.current = chunksRef.current.filter((c) => c.arrivedAt >= cutoff);
    };

    recorder.onstop = () => {
      if (discardRef.current) {
        // Session expired with no vote — discard silently
        chunksRef.current = [];
        setStatus("stopped");
        return;
      }

      const allChunks = chunksRef.current;
      chunksRef.current = [];

      if (voteTimestampRef.current !== undefined) {
        // Clip to [voteTimestamp - PRE_VOTE_MS, voteTimestamp + POST_VOTE_MS]
        const clipStart = voteTimestampRef.current - PRE_VOTE_MS;
        const clipEnd   = voteTimestampRef.current + POST_VOTE_MS;
        const clipped = allChunks.filter(
          (c) => c.arrivedAt >= clipStart && c.arrivedAt <= clipEnd
        );
        // Fall back to full recording if the clip yields nothing
        const source = clipped.length > 0 ? clipped : allChunks;
        const assembled = new Blob(source.map((c) => c.data), { type: mimeTypeRef.current });
        setBlob(assembled);
      } else {
        // No vote timestamp — assemble the full recording
        const assembled = new Blob(allChunks.map((c) => c.data), { type: mimeTypeRef.current });
        setBlob(assembled);
      }

      setStatus("stopped");
    };

    recorder.onerror = () => {
      setStatus("recording_failed");
    };

    // 500 ms timeslice gives fine-grained chunk timestamps for accurate clipping
    recorder.start(500);
    setStatus("recording");
  }, [stream]);

  return { start, stop, status, blob };
}
