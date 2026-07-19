/**
 * VideoRecorder component
 *
 * Drives the camera → record → upload flow for election video recording.
 * The parent (ElectionVotingPage) owns the 30-second session timer and
 * notifies this component via `voteTimestamp` and `sessionExpired` props.
 *
 * Flow:
 *   1. Camera permission requested automatically on mount.
 *   2. Recording starts automatically once permission is granted.
 *   3. Parent calls onReadyToVote() when upload completes → vote button unlocks.
 *   4. When the voter casts a vote, the parent sets `voteTimestamp` (epoch ms).
 *      The component then waits for the post-vote window (10 s) and stops.
 *   5. If `sessionExpired` becomes true before a vote, recording is discarded.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertCircle, Camera, CheckCircle, Mic, RefreshCw } from 'lucide-react';

import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { StepIndicator } from './StepIndicator';

// ─── Types ────────────────────────────────────────────────────────────────────

type RecorderState =
  | 'requesting_permission'
  | 'permission_denied'
  | 'unsupported'
  | 'ready'
  | 'recording'
  | 'recording_failed'
  | 'processing'
  | 'uploading'
  | 'upload_failed'
  | 'complete'
  | 'discarded'; // session expired before vote

export type VideoRecorderProps = {
  electionId: string;
  voterId: string;
  token: string | null;
  /** Epoch ms when the vote was cast; triggers post-vote window + stop */
  voteTimestamp: number | null;
  /** True when the 30-second session has expired with no vote cast */
  sessionExpired: boolean;
  /** Called when recording starts (camera granted) — parent starts session timer */
  onSessionStart: () => void;
  /** Called when upload is complete and videoRecordingId is ready */
  onRecordingComplete: (videoRecordingId: string) => void;
  onError: (message: string) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BLOB_BYTES   = 83_886_080; // 80 MB
const POST_VOTE_WAIT_MS = 10_000;    // wait 10 s after vote before stopping

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stateToStep(state: RecorderState): 0 | 1 | 2 | 3 {
  switch (state) {
    case 'requesting_permission':
    case 'permission_denied':
    case 'unsupported':
    case 'ready':
      return 0;  // Camera
    case 'recording':
    case 'recording_failed':
    case 'discarded':
      return 1;  // Record & Vote
    case 'processing':
    case 'uploading':
    case 'upload_failed':
      return 2;  // Uploading
    case 'complete':
      return 3;  // Done
  }
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordingBadge({ active }: { active: boolean }) {
  return (
    <motion.div
      className="w-3 h-3 rounded-full bg-red-500 shrink-0"
      animate={active ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : { scale: 1 }}
      transition={{ duration: 1.2, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
    />
  );
}

function StatusLabel({
  state,
  errorDetail,
}: {
  state: RecorderState;
  errorDetail?: string | null;
}) {
  switch (state) {
    case 'requesting_permission':
      return (
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <Camera size={16} className="shrink-0" />
          <span>Requesting camera…</span>
        </div>
      );
    case 'permission_denied':
      return (
        <div className="flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorDetail ?? 'Camera permission denied. Camera access is required to vote.'}</span>
        </div>
      );
    case 'unsupported':
      return (
        <div className="flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>Your browser does not support video recording. Please use a modern browser.</span>
        </div>
      );
    case 'ready':
      return (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Camera size={16} className="shrink-0" />
          <span>Camera ready — recording will start automatically</span>
        </div>
      );
    case 'recording':
      return (
        <div className="flex items-center gap-2 text-white text-sm">
          <Mic size={16} className="shrink-0" />
          <span>Recording your voting session…</span>
        </div>
      );
    case 'recording_failed':
      return (
        <div className="flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorDetail ?? 'Recording failed.'}</span>
        </div>
      );
    case 'processing':
      return (
        <div className="flex items-center gap-2 text-yellow-300 text-sm">
          <RefreshCw size={16} className="shrink-0 animate-spin" />
          <span>Preparing upload…</span>
        </div>
      );
    case 'uploading':
      return (
        <div className="flex items-center gap-2 text-blue-300 text-sm">
          <RefreshCw size={16} className="shrink-0 animate-spin" />
          <span>Uploading recording…</span>
        </div>
      );
    case 'upload_failed':
      return (
        <div className="flex items-start gap-2 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorDetail ? `Upload failed: ${errorDetail}` : 'Upload failed.'}</span>
        </div>
      );
    case 'complete':
      return (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          <span>Recording saved ✓</span>
        </div>
      );
    case 'discarded':
      return (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>Session expired — recording discarded.</span>
        </div>
      );
  }
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="w-full bg-gray-700 rounded-full h-2 overflow-hidden mt-2"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-blue-500 transition-all duration-300 rounded-full"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoRecorder({
  electionId,
  voterId,
  token,
  voteTimestamp,
  sessionExpired,
  onSessionStart,
  onRecordingComplete,
  onError,
}: VideoRecorderProps) {
  console.log('🎥 [VideoRecorder] Component mounted/rendered', {
    electionId,
    voterId,
    hasToken: !!token,
    voteTimestamp,
    sessionExpired
  });

  const { stream, status: cameraStatus, error: cameraError } = useCameraPermission();
  const { start: startRecording, stop, status: mediaStatus, blob: recordedBlob } = useMediaRecorder(stream);

  const [recorderState, setRecorderState] = useState<RecorderState>('requesting_permission');
  const [errorDetail, setErrorDetail]     = useState<string | null>(null);
  const [blobSize, setBlobSize]           = useState<number | null>(null);

  const recordingStartedRef  = useRef(false);
  const videoRecordingIdRef  = useRef<string | null>(null);
  const completedRef         = useRef(false);
  const pendingBlobRef       = useRef<Blob | null>(null);
  // Tracks whether we already triggered the post-vote stop timer
  const postVoteTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether stop() was already called
  const stoppedRef           = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { upload, uploadProgress, retryCount, status: uploadStatus } = useVideoUpload({
    electionId,
    voterId,
    token,
    onComplete: (id) => {
      videoRecordingIdRef.current = id;
      setRecorderState('complete');
    },
    onError: (msg) => {
      setErrorDetail(msg);
      setRecorderState('upload_failed');
      onError(msg);
    },
  });

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  // Drive state machine: camera permission
  useEffect(() => {
    console.log('🎥 [VideoRecorder] Camera status changed:', { cameraStatus, cameraError });
    
    if (cameraStatus === 'pending')     { setRecorderState('requesting_permission'); return; }
    if (cameraStatus === 'unsupported') { setRecorderState('unsupported'); setErrorDetail(cameraError); return; }
    if (cameraStatus === 'denied')      { setRecorderState('permission_denied'); setErrorDetail(cameraError); return; }
    if (cameraStatus === 'granted' && !recordingStartedRef.current) {
      console.log('🎥 [VideoRecorder] Camera granted, setting ready state');
      setRecorderState('ready');
    }
  }, [cameraStatus, cameraError]);

  // Auto-start recording when camera is granted
  useEffect(() => {
    if (cameraStatus === 'granted' && stream && !recordingStartedRef.current && mediaStatus !== 'unsupported') {
      console.log('🎥 [VideoRecorder] Auto-starting recording...');
      recordingStartedRef.current = true;
      stoppedRef.current = false;
      setRecorderState('recording');
      startRecording();
      onSessionStart(); // notify parent to start the 30-second session timer
      console.log('🎥 [VideoRecorder] Recording started, session timer triggered');
    }
  }, [cameraStatus, stream, mediaStatus, startRecording, onSessionStart]);

  // MediaRecorder error
  useEffect(() => {
    if (mediaStatus === 'unsupported') {
      setRecorderState('unsupported');
      setErrorDetail('Your browser does not support any required video recording formats.');
    }
    if (mediaStatus === 'recording_failed') setRecorderState('recording_failed');
  }, [mediaStatus]);

  // ── Handle voteTimestamp: wait POST_VOTE_WAIT_MS then stop with clip ────────
  useEffect(() => {
    if (voteTimestamp === null) return;
    if (stoppedRef.current) return;
    if (postVoteTimerRef.current !== null) return; // already scheduled

    console.log('🎥 [VideoRecorder] Vote cast detected!', { voteTimestamp });

    // Schedule stop after post-vote window
    const remaining = (voteTimestamp + POST_VOTE_WAIT_MS) - Date.now();
    const delay = Math.max(0, remaining);

    console.log(`🎥 [VideoRecorder] Scheduling stop in ${delay}ms (post-vote wait: ${POST_VOTE_WAIT_MS}ms)`);

    postVoteTimerRef.current = setTimeout(() => {
      postVoteTimerRef.current = null;
      if (!stoppedRef.current) {
        console.log('🎥 [VideoRecorder] Stopping recording after post-vote window');
        stoppedRef.current = true;
        stop(voteTimestamp, false); // clip around vote event
      }
    }, delay);

    return () => {
      if (postVoteTimerRef.current !== null) {
        clearTimeout(postVoteTimerRef.current);
        postVoteTimerRef.current = null;
      }
    };
  }, [voteTimestamp, stop]);

  // ── Handle sessionExpired: discard recording if no vote cast ────────────────
  useEffect(() => {
    if (!sessionExpired) return;
    if (stoppedRef.current) return;
    if (voteTimestamp !== null) return; // vote was cast — don't discard

    stoppedRef.current = true;
    if (postVoteTimerRef.current !== null) {
      clearTimeout(postVoteTimerRef.current);
      postVoteTimerRef.current = null;
    }
    stop(undefined, true); // discard
    setRecorderState('discarded');
  }, [sessionExpired, voteTimestamp, stop]);

  // ── Blob produced → validate size → upload (or discard) ─────────────────────
  useEffect(() => {
    if (!recordedBlob || mediaStatus !== 'stopped') return;

    console.log('🎥 [VideoRecorder] Blob produced', { 
      blobSize: recordedBlob.size, 
      mediaStatus,
      recorderState 
    });

    // Discarded path — blob is null in the hook when discard=true, but guard anyway
    if (recorderState === 'discarded') return;

    pendingBlobRef.current = recordedBlob;
    setBlobSize(recordedBlob.size);
    setRecorderState('processing');

    if (recordedBlob.size > MAX_BLOB_BYTES) {
      const msg = `Recording is too large (${formatMB(recordedBlob.size)} MB).`;
      console.error('🎥 [VideoRecorder] Upload blocked - file too large');
      setErrorDetail(msg);
      setRecorderState('upload_failed');
      onError(msg);
      return;
    }

    console.log('🎥 [VideoRecorder] Starting upload...');
    setRecorderState('uploading');
    upload(recordedBlob);
  }, [recordedBlob, mediaStatus, recorderState, upload, onError]);

  // Sync upload status
  useEffect(() => {
    if (uploadStatus === 'uploading') setRecorderState('uploading');
  }, [uploadStatus]);

  // Call onRecordingComplete once
  useEffect(() => {
    if (recorderState === 'complete' && !completedRef.current) {
      const id = videoRecordingIdRef.current;
      if (id) {
        console.log('🎥 [VideoRecorder] Upload complete! Video ID:', id);
        completedRef.current = true;
        toast.success('Recording saved successfully!');
        onRecordingComplete(id);
      }
    }
  }, [recorderState, onRecordingComplete]);

  // Retry upload
  function handleRetryUpload() {
    if (!pendingBlobRef.current) return;
    setErrorDetail(null);
    setRecorderState('uploading');
    upload(pendingBlobRef.current);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-950">
      <StepIndicator currentStep={stateToStep(recorderState)} />

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-cover"
        aria-label="Webcam live preview"
      />

      {blobSize !== null && ['processing', 'uploading', 'upload_failed'].includes(recorderState) && (
        <div className="px-4 pt-2 text-xs text-gray-400">File size: {formatMB(blobSize)} MB</div>
      )}

      <div className="p-4 flex items-center gap-3 flex-wrap">
        <RecordingBadge active={recorderState === 'recording'} />
        <div className="flex-1 min-w-0">
          <StatusLabel state={recorderState} errorDetail={errorDetail} />
        </div>
        {recorderState === 'uploading' && (
          <div className="w-full">
            <ProgressBar percent={uploadProgress} />
            <p className="text-xs text-gray-400 mt-1 text-right">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {recorderState === 'upload_failed' && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {retryCount < 3 && (
            <button
              type="button"
              onClick={handleRetryUpload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Retry Upload
            </button>
          )}
          {retryCount >= 3 && (
            <p className="text-xs text-yellow-400">
              Upload failed 3 times. Please check your connection and try voting again later.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
