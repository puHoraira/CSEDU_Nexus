import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Video, Copy, ArrowLeft, Users, Clock, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type MeetingRow = {
  _id: string; roomId?: string; meetingMode: string;
  title: string; agenda: string; meetingDate: string;
  venue: string; status: string;
};

type ZegoKitTokenPayload = {
  appToken: string; roomId: string; userId: string; userName: string;
};

declare global {
  interface Window {
    ZegoUIKitPrebuilt?: { create: (token: string) => { joinRoom: (cfg: any) => void } };
    ZegoPrebuiltUIKit?: { create: (token: string) => { joinRoom: (cfg: any) => void } };
  }
}

const UIKIT_SCRIPT = 'https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js';

async function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ZegoUIKit'));
    document.body.appendChild(s);
  });
}

export function MeetingLivePage() {
  const { id } = useParams();
  const { user, token, loading } = useAuth();
  const roomRef   = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);
  const [joined,   setJoined]   = useState(false);
  const [joining,  setJoining]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-live', token],
    queryFn: () => apiRequest<MeetingRow[]>('/meetings', { token }),
    enabled: Boolean(token),
  });

  const meeting = useMemo(() => meetings.find(m => m._id === id), [meetings, id]);
  const isOnline = (meeting?.meetingMode || (meeting?.roomId ? 'Online' : 'Offline')) === 'Online';
  const roomID   = isOnline ? (meeting?.roomId || `csedu-meeting-${id}`) : '';

  const { data: zegoData, isLoading: tokenLoading } = useQuery({
    queryKey: ['zego-token', id, token],
    queryFn: () => apiRequest<ZegoKitTokenPayload>(`/meetings/${id}/zego-kit-token`, { token }),
    enabled: Boolean(token && id && isOnline),
  });

  useEffect(() => {
    if (user) setUserName(`${user.firstName} ${user.lastName}`.trim() || user.email);
  }, [user]);

  // Auto-join when token is ready
  useEffect(() => {
    if (joinedRef.current || !zegoData?.appToken || !isOnline || !roomRef.current) return;
    joinedRef.current = true;
    joinRoom(zegoData.appToken, zegoData.userName || userName);
  }, [zegoData, isOnline]);

  async function joinRoom(appToken: string, displayName: string) {
    try {
      setJoining(true);
      setError(null);
      await loadScript(UIKIT_SCRIPT);
      const factory = window.ZegoUIKitPrebuilt || window.ZegoPrebuiltUIKit;
      if (!factory) throw new Error('ZegoUIKit not available');
      const zp = factory.create(appToken);
      zp.joinRoom({
        container: roomRef.current,
        sharedLinks: [{ name: 'Meeting room', url: window.location.href }],
        scenario: { mode: 2 }, // VideoConference
        showPreJoinView: true,
        userName: displayName,
      });
      setJoined(true);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setJoining(false);
    }
  }

  function handleManualJoin() {
    if (!zegoData?.appToken) { toast.error('Token not ready yet'); return; }
    joinedRef.current = false;
    joinRoom(zegoData.appToken, zegoData.userName || userName);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Room link copied!'))
      .catch(() => toast.error('Could not copy link'));
  }

  return (
    <div className="ui-page">
      <PageHeader
        title={meeting?.title || 'Meeting Room'}
        description={meeting?.agenda}
        backButton
        breadcrumbs={[
          { label: 'Meetings', href: '/dashboard/meetings' },
          { label: meeting?.title || 'Meeting', href: `/dashboard/meetings/${id}` },
          { label: 'Live Room' },
        ]}
      />

      {/* Meeting info bar */}
      {meeting && (
        <div className="ui-card">
          <div className="ui-card__body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Clock size={15} style={{ color: 'var(--accent)' }} />
              <span className="ui-text-sm ui-text-muted">{formatDateTime(meeting.meetingDate)}</span>
            </div>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <MapPin size={15} style={{ color: 'var(--accent)' }} />
              <span className="ui-text-sm ui-text-muted">{isOnline ? 'Online' : meeting.venue}</span>
            </div>
            <div className="ui-flex ui-flex-gap-2" style={{ alignItems: 'center' }}>
              <Video size={15} style={{ color: 'var(--accent)' }} />
              <span className="ui-text-sm ui-text-muted">Room: {roomID || '—'}</span>
            </div>
            <Badge variant={meeting.status === 'Ongoing' ? 'success' : 'warning'}>{meeting.status}</Badge>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" leftIcon={Copy} onClick={copyLink}>Copy Link</Button>
              <Button variant="ghost" size="sm" leftIcon={ArrowLeft} href={`/dashboard/meetings/${id}`}>Back</Button>
            </div>
          </div>
        </div>
      )}

      {/* Offline meeting */}
      {meeting && !isOnline && (
        <Alert variant="warning">
          This is an offline meeting — no video room is available. Attend in person at <strong>{meeting.venue}</strong>.
        </Alert>
      )}

      {/* Online meeting room */}
      {isOnline && (
        <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Loading state */}
          {(tokenLoading || joining) && !joined && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 16 }}>
              <Spinner size="xl" />
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                {tokenLoading ? 'Preparing your meeting room…' : 'Connecting to room…'}
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !joining && (
            <div style={{ padding: 24 }}>
              <Alert variant="error" title="Could not join room">
                {error}
              </Alert>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <Button leftIcon={Video} onClick={handleManualJoin} isLoading={joining}>
                  Try Again
                </Button>
                <Button variant="outline" href={`/dashboard/meetings/${id}`}>
                  Back to Meeting
                </Button>
              </div>
            </div>
          )}

          {/* Pre-join prompt when token ready but not yet joined */}
          {!tokenLoading && !joining && !joined && !error && zegoData?.appToken && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 20 }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 8px 24px var(--accent-glow)',
              }}>
                <Video size={36} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>Ready to join?</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                  You'll join as <strong>{zegoData.userName || userName}</strong>
                </p>
              </div>
              <div className="ui-input-wrap" style={{ width: '100%', maxWidth: 320 }}>
                <label className="ui-input-label">Display Name</label>
                <input className="ui-input" value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Your name in the meeting" />
              </div>
              <Button leftIcon={Video} onClick={handleManualJoin} isLoading={joining}>
                Join Meeting Room
              </Button>
            </motion.div>
          )}

          {/* The actual Zego room renders here */}
          <div
            ref={roomRef}
            style={{
              width: '100%',
              height: joined ? '75vh' : 0,
              minHeight: joined ? 500 : 0,
              transition: 'height 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
