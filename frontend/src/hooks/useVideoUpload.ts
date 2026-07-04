import { useState, useRef, useCallback, useEffect } from "react";
import { env } from "../config/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoUploadStatus =
  | "idle"
  | "uploading"
  | "upload_failed"
  | "complete";

export interface UseVideoUploadOptions {
  electionId: string;
  voterId: string;
  token: string | null;
  onComplete: (videoRecordingId: string) => void;
  onError: (message: string) => void;
}

export interface UseVideoUploadResult {
  upload: (blob: Blob) => void;
  uploadProgress: number; // 0–100
  retryCount: number;
  maxRetriesReached: boolean;
  status: VideoUploadStatus;
}

// Maximum number of consecutive upload attempts before giving up (Req 7.3)
const MAX_RETRIES = 3;

// Backend upload endpoint — uses env.apiBaseUrl so the XHR targets the correct
// backend origin in dev (port 5000) and production alike (Req 4.1)
const UPLOAD_URL = `${env.apiBaseUrl}/elections/recordings/upload`;

/**
 * Hook that manages video upload lifecycle for election vote recording.
 *
 * - Uses XMLHttpRequest (not fetch) to enable upload progress events (Req 4.2).
 * - Tracks upload percentage via xhr.upload.onprogress.
 * - On success, extracts videoRecordingId from the response and calls onComplete (Req 4.3).
 * - On network error or non-2xx response, increments retryCount and calls onError (Req 4.4, 4.5).
 * - After MAX_RETRIES (3) consecutive failures, sets maxRetriesReached (Req 7.3).
 * - Resets progress and error state before each attempt (Req 7.4).
 * - Stores the current blob in a ref so retries can re-use it (Req 4.4).
 * - Stores callbacks in refs to avoid stale closure issues.
 * - Aborts any in-flight XHR on component unmount.
 */
export function useVideoUpload({
  electionId,
  voterId,
  token,
  onComplete,
  onError,
}: UseVideoUploadOptions): UseVideoUploadResult {
  const [status, setStatus] = useState<VideoUploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [maxRetriesReached, setMaxRetriesReached] = useState<boolean>(false);

  // Ref to the current Blob so retries can re-upload the same file
  const blobRef = useRef<Blob | null>(null);

  // XHR ref so we can abort on unmount
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Callback refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Retry count ref to read latest value inside XHR callbacks without stale closure
  const retryCountRef = useRef<number>(0);

  // Abort any in-flight XHR when the component unmounts
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
    };
  }, []);

  const upload = useCallback(
    (blob: Blob) => {
      // Store the blob for potential retries (Req 4.4)
      blobRef.current = blob;

      // Abort any in-flight request before starting a new one
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }

      // Reset progress and status before each attempt (Req 7.4)
      setUploadProgress(0);
      setStatus("uploading");

      // Build multipart/form-data body (Req 4.1)
      const formData = new FormData();
      formData.append("video", blob);
      formData.append("electionId", electionId);
      formData.append("voterId", voterId);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // ── Upload progress events (Req 4.2) ──────────────────────────────────
      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      // ── Successful response (Req 4.3) ─────────────────────────────────────
      xhr.onload = () => {
        xhrRef.current = null;

        if (xhr.status >= 200 && xhr.status < 300) {
          // Parse JSON and extract videoRecordingId
          try {
            const parsed = JSON.parse(xhr.responseText) as {
              success: boolean;
              data: { videoRecordingId: string };
              message: string;
            };
            const videoRecordingId = parsed?.data?.videoRecordingId;
            if (!videoRecordingId) {
              throw new Error("Missing videoRecordingId in response");
            }
            setUploadProgress(100);
            setStatus("complete");
            onCompleteRef.current(videoRecordingId);
          } catch {
            handleFailure("Upload succeeded but response was malformed.");
          }
        } else {
          // Non-2xx response — try to extract backend error message (Req 4.5)
          let message = `Upload failed with status ${xhr.status}.`;
          try {
            const parsed = JSON.parse(xhr.responseText) as {
              message?: string;
            };
            if (parsed?.message) {
              message = parsed.message;
            }
          } catch {
            // ignore parse errors; use the default message
          }
          handleFailure(message);
        }
      };

      // ── Network error (Req 4.4) ────────────────────────────────────────────
      xhr.onerror = () => {
        xhrRef.current = null;
        handleFailure(
          "Network error — please check your connection and try again."
        );
      };

      // ── Abort event (not counted as a retry failure) ───────────────────────
      xhr.onabort = () => {
        xhrRef.current = null;
        // Silently reset to idle when the XHR is deliberately aborted (e.g. unmount)
        setStatus("idle");
      };

      // Open and send the request
      xhr.open("POST", UPLOAD_URL);

      // Set Authorization header (Req 9.1)
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.send(formData);
    },
    [electionId, voterId, token]
  );

  /**
   * Handles a failed upload attempt.
   * Increments the retry counter, sets maxRetriesReached after MAX_RETRIES,
   * transitions to 'upload_failed', and calls onError with the message.
   */
  function handleFailure(message: string) {
    // Use the ref value for the latest count inside async callback
    const newRetryCount = retryCountRef.current + 1;
    retryCountRef.current = newRetryCount;

    setRetryCount(newRetryCount);

    if (newRetryCount >= MAX_RETRIES) {
      setMaxRetriesReached(true);
    }

    setStatus("upload_failed");
    onErrorRef.current(message);
  }

  return {
    upload,
    uploadProgress,
    retryCount,
    maxRetriesReached,
    status,
  };
}
