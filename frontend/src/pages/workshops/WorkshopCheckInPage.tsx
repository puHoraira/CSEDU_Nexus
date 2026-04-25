import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle, XCircle, Camera, User2, Clock } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest, normalizeApiError } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/utils';
import toast from 'react-hot-toast';

type Workshop = { _id: string; title: string; stats: { totalAttendees: number; totalApproved: number } };
type CheckInResult = {
  success: boolean;
  participant: { name: string; email: string; workshop: string; checkedIn: string };
};

export function WorkshopCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading } = useAuth();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [recentCheckins, setRecentCheckins] = useState<CheckInResult['participant'][]>([]);

  const { data: workshop } = useQuery({
    queryKey: ['workshop', id],
    queryFn: () => apiRequest<Workshop>(`/workshops/${id}`, { token }),
    enabled: Boolean(id) && !loading,
  });

  const checkInMut = useMutation({
    mutationFn: (qrToken: string) => apiRequest<CheckInResult>('/workshops/check-in', {
      method: 'POST', token, body: JSON.stringify({ qrToken }),
    }),
    onSuccess: (data) => {
      setLastResult(data);
      setLastError(null);
      setRecentCheckins(prev => [data.participant, ...prev.slice(0, 9)]);
      toast.success(`✓ ${data.participant.name} checked in!`);
    },
    onError: (e) => {
      setLastError(normalizeApiError(e));
      setLastResult(null);
      toast.error(normalizeApiError(e));
    },
  });

  // Start QR scanner
  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.token) {
            checkInMut.mutate(data.token);
            scanner.pause(true);
            setTimeout(() => scanner.resume(), 2000);
          }
        } catch {
          checkInMut.mutate(decodedText);
        }
      },
      () => {} // ignore errors
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning]);

  return (
    <div className="ui-page">
      <PageHeader
        title="QR Check-in Scanner"
        description={workshop ? `Workshop: ${workshop.title}` : 'Scan participant QR codes for check-in'}
        backButton
        breadcrumbs={[
          { label: 'Workshops', href: '/dashboard/workshops' },
          { label: workshop?.title ?? 'Workshop', href: `/dashboard/workshops/${id}` },
          { label: 'Check-in' },
        ]}
      />

      {/* Stats */}
      {workshop && (
        <div className="ui-grid-2">
          <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 14, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <div className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Checked In</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{workshop.stats.totalAttendees}</div>
            </div>
          </div>
          <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, borderRadius: 14, background: 'var(--gradient-primary)', color: '#fff' }}>
              <User2 size={22} />
            </div>
            <div>
              <div className="ui-text-xs ui-text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Approved</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)' }}>{workshop.stats.totalApproved}</div>
            </div>
          </div>
        </div>
      )}

      <div className="ui-grid-2" style={{ alignItems: 'start' }}>
        {/* Scanner */}
        <div className="ui-card">
          <div className="ui-card__header">
            <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={17} style={{ color: 'var(--accent)' }} /> QR Scanner
            </h3>
          </div>
          <div className="ui-card__body">
            {!scanning ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff' }}>
                  <QrCode size={36} />
                </div>
                <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  Click to start scanning participant QR codes
                </p>
                <Button leftIcon={Camera} onClick={() => setScanning(true)}>
                  Start Scanner
                </Button>
              </div>
            ) : (
              <>
                <div id="qr-reader" style={{ width: '100%' }} />
                <Button variant="outline" fullWidth onClick={() => setScanning(false)} style={{ marginTop: 12 }}>
                  Stop Scanner
                </Button>
              </>
            )}

            {/* Result feedback */}
            <AnimatePresence>
              {lastResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 700, color: '#10b981' }}>Check-in Successful!</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', fontWeight: 600 }}>{lastResult.participant.name}</p>
                  <p className="ui-text-xs ui-text-muted">{lastResult.participant.email}</p>
                </motion.div>
              )}
              {lastError && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={18} style={{ color: '#ef4444' }} />
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>{lastError}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Manual entry + Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Manual token entry */}
          <div className="ui-card">
            <div className="ui-card__header"><h3 className="ui-card__title">Manual Entry</h3></div>
            <div className="ui-card__body">
              <p className="ui-text-xs ui-text-muted" style={{ marginBottom: 12 }}>
                Enter QR token manually if scanner is unavailable
              </p>
              <div className="ui-input-wrap" style={{ marginBottom: 12 }}>
                <label className="ui-input-label">QR Token</label>
                <input className="ui-input" value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="WS-xxxxx-xxxxxxxx"
                  onKeyDown={e => { if (e.key === 'Enter' && manualToken.trim()) { checkInMut.mutate(manualToken.trim()); setManualToken(''); } }}
                />
              </div>
              <Button fullWidth isLoading={checkInMut.isPending}
                onClick={() => { if (manualToken.trim()) { checkInMut.mutate(manualToken.trim()); setManualToken(''); } }}>
                Check In
              </Button>
            </div>
          </div>

          {/* Recent check-ins */}
          {recentCheckins.length > 0 && (
            <div className="ui-card" style={{ padding: 0 }}>
              <div className="ui-card__header">
                <h3 className="ui-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} /> Recent Check-ins
                </h3>
              </div>
              <div>
                {recentCheckins.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
                    borderBottom: i < recentCheckins.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {c.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }} className="ui-truncate">{c.name}</p>
                      <p className="ui-text-xs ui-text-muted ui-truncate">{c.email}</p>
                    </div>
                    <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
