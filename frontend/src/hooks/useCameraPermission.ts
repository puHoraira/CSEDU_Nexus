import { useState, useRef, useEffect, useCallback } from "react";

export type CameraPermissionStatus = "pending" | "granted" | "denied" | "unsupported";

export interface UseCameraPermissionResult {
  stream: MediaStream | null;
  error: string | null;
  status: CameraPermissionStatus;
  cleanup: () => void;
}

const ERROR_MAP: Record<string, string> = {
  NotAllowedError: "Camera permission denied",
  NotFoundError: "No camera found on this device",
  NotReadableError: "Camera is in use by another application",
  OverconstrainedError: "Camera does not meet the required constraints",
  SecurityError: "Camera access blocked by browser security policy",
  AbortError: "Camera access was interrupted",
};

/**
 * Hook that requests camera and microphone permissions via getUserMedia.
 *
 * - Requests permissions immediately on mount.
 * - Returns { stream, error, status } where status is one of:
 *   'pending' | 'granted' | 'denied' | 'unsupported'
 * - Maps DOMException names to human-readable strings via ERROR_MAP.
 * - Checks for navigator.mediaDevices existence before calling and sets
 *   status to 'unsupported' if absent.
 * - Exposes a cleanup function that calls track.stop() on all stream tracks.
 *   This cleanup is also registered in useEffect so the camera light turns
 *   off automatically when the component unmounts (Requirement 1.6).
 */
export function useCameraPermission(): UseCameraPermissionResult {
  const [status, setStatus] = useState<CameraPermissionStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stable cleanup function — stops all active tracks and clears the ref
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Check browser support before attempting getUserMedia
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setStatus("unsupported");
      setError("Your browser does not support video recording. Please use a modern browser.");
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then((mediaStream) => {
        if (cancelled) {
          // Component unmounted before permission was resolved — stop tracks immediately
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        setStatus("granted");
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        if (err instanceof DOMException) {
          const humanReadable = ERROR_MAP[err.name] ?? `Camera error: ${err.message}`;
          setError(humanReadable);
          // NotAllowedError / SecurityError → denied; everything else → denied too
          // (device not found, in use, etc. all prevent recording)
          setStatus("denied");
        } else if (err instanceof Error) {
          setError(err.message);
          setStatus("denied");
        } else {
          setError("An unknown error occurred while accessing the camera.");
          setStatus("denied");
        }
      });

    // Cleanup: stop tracks when the component unmounts (camera indicator light off)
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [cleanup]);

  return {
    stream: streamRef.current,
    error,
    status,
    cleanup,
  };
}
