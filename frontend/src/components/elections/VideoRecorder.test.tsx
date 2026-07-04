import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { VideoRecorder } from './VideoRecorder';

const stopMock = vi.fn();
const uploadMock = vi.fn();

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../hooks/useCameraPermission', () => ({
  useCameraPermission: () => ({
    stream: {} as MediaStream,
    status: 'granted' as const,
    error: null,
  }),
}));

vi.mock('../../hooks/useMediaRecorder', () => ({
  useMediaRecorder: () => ({
    start: vi.fn(),
    stop: stopMock,
    status: 'recording' as const,
    blob: null,
    maxDurationReached: false,
  }),
}));

vi.mock('../../hooks/useVideoUpload', () => ({
  useVideoUpload: () => ({
    upload: uploadMock,
    uploadProgress: 0,
    retryCount: 0,
    maxRetriesReached: false,
    status: 'idle' as const,
  }),
}));

describe('VideoRecorder', () => {
  beforeEach(() => {
    stopMock.mockReset();
    uploadMock.mockReset();
  });

  it('stops recording when submit is requested', async () => {
    const { rerender } = render(
      <VideoRecorder
        electionId="507f1f77bcf86cd799439011"
        voterId="507f1f77bcf86cd799439012"
        token="token"
        onRecordingComplete={vi.fn()}
        onError={vi.fn()}
        isSubmitting={false}
      />
    );

    rerender(
      <VideoRecorder
        electionId="507f1f77bcf86cd799439011"
        voterId="507f1f77bcf86cd799439012"
        token="token"
        onRecordingComplete={vi.fn()}
        onError={vi.fn()}
        isSubmitting={true}
      />
    );

    await waitFor(() => {
      expect(stopMock).toHaveBeenCalledTimes(1);
    });
  });
});
