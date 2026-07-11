import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileImage, FileText, Share2, RefreshCw } from 'lucide-react';
import {
  PosterData, PosterTheme, POSTER_THEMES,
  generatePoster, downloadPoster, downloadPosterAsPDF,
} from '../../lib/posterGenerator';
import toast from 'react-hot-toast';

interface Props {
  data: PosterData;
  onClose?: () => void;
}

/** Fields shown in the editor, in order. `full` spans both columns. */
const FIELD_DEFS: Array<{ key: keyof PosterData; label: string; placeholder?: string; full?: boolean; textarea?: boolean }> = [
  { key: 'title', label: 'Title', full: true },
  { key: 'subtitle', label: 'Subtitle', full: true },
  { key: 'category', label: 'Category / Track', placeholder: 'e.g. AI & ML' },
  { key: 'organizer', label: 'Organizer', placeholder: "CSEDU Students' Club" },
  { key: 'time', label: 'Time', placeholder: '10:00 AM – 1:00 PM' },
  { key: 'location', label: 'Venue', placeholder: 'Room 401 / Online' },
  { key: 'mode', label: 'Mode', placeholder: 'Online / In-person' },
  { key: 'level', label: 'Level', placeholder: 'Beginner' },
  { key: 'fee', label: 'Fee / Entry', placeholder: 'Free / ৳500' },
  { key: 'capacity', label: 'Capacity', placeholder: '120 seats' },
  { key: 'registrationDeadline', label: 'Register By', placeholder: 'ISO date or text' },
  { key: 'cta', label: 'Call to action', placeholder: 'Register now!' },
  { key: 'description', label: 'Description', full: true, textarea: true },
];

export function PosterGenerator({ data: initialData, onClose }: Props) {
  const [form, setForm] = useState<PosterData>(initialData);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [highlights, setHighlights] = useState<string>((initialData.additionalInfo || []).join(', '));
  const debounceRef = useRef<number | null>(null);

  // Assemble the poster payload from the editable form + highlight chips.
  const payload: PosterData = useMemo(() => ({
    ...form,
    additionalInfo: highlights.split(',').map((s) => s.trim()).filter(Boolean),
  }), [form, highlights]);

  // Debounced live preview whenever inputs change.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        setPreview(await generatePoster(payload));
      } catch (e) {
        console.error('Preview error:', e);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const setField = (key: keyof PosterData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const filenameBase = `${payload.type}-${(payload.title || 'poster').replace(/\s+/g, '-').toLowerCase()}`;

  const handleDownloadPNG = async () => {
    setDownloading(true);
    try { await downloadPoster(payload, `${filenameBase}.png`); toast.success('Downloaded PNG'); }
    catch { toast.error('Failed to download'); }
    finally { setDownloading(false); }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try { await downloadPosterAsPDF(payload, `${filenameBase}.pdf`); toast.success('Downloaded PDF'); }
    catch { toast.error('Failed to download'); }
    finally { setDownloading(false); }
  };

  const handleShare = async () => {
    if (!preview) return;
    try {
      const blob = await (await fetch(preview)).blob();
      const file = new File([blob], `${filenameBase}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: payload.title, text: `Check out this ${payload.type}!`, files: [file] });
        toast.success('Shared');
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('Copied to clipboard');
      }
    } catch { toast.error('Failed to share'); }
  };

  return (
    <div className="ui-card" style={{ maxHeight: '86vh', overflowY: 'auto' }}>
      <div className="ui-card__header">
        <h3 className="ui-card__title">Poster Studio</h3>
        {onClose && <button onClick={onClose} className="ui-btn ui-btn--ghost ui-btn--sm">Close</button>}
      </div>

      <div className="ui-card__body">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 300px)', gap: 20, alignItems: 'start' }}>
          {/* Preview column */}
          <div>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)', minHeight: 320 }}>
              {preview ? (
                <img src={preview} alt="Poster preview" style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                  <FileImage size={44} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--muted)', margin: 0 }}>Preview will appear here</p>
                </div>
              )}
              {loading && (
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 12px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  <RefreshCw size={13} className="ui-spin" /> Updating…
                </div>
              )}
            </div>

            <div className="ui-flex ui-flex-wrap ui-flex-gap-2" style={{ marginTop: 14 }}>
              <button onClick={handleDownloadPNG} disabled={downloading || !preview} className="ui-btn ui-btn--primary ui-btn--sm">
                <Download size={16} /> PNG
              </button>
              <button onClick={handleDownloadPDF} disabled={downloading || !preview} className="ui-btn ui-btn--secondary ui-btn--sm">
                <FileText size={16} /> PDF
              </button>
              <button onClick={handleShare} disabled={!preview} className="ui-btn ui-btn--secondary ui-btn--sm">
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>

          {/* Editor column */}
          <div className="ui-flex-col" style={{ gap: 14 }}>
            {/* Theme swatches */}
            <div>
              <span className="ui-input-label" style={{ display: 'block', marginBottom: 8 }}>Theme</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {POSTER_THEMES.map((t) => {
                  const active = (form.theme || 'blue') === t.id;
                  return (
                    <button
                      key={t.id}
                      title={t.label}
                      onClick={() => setForm((f) => ({ ...f, theme: t.id as PosterTheme }))}
                      style={{
                        width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                        background: t.swatch,
                        border: active ? '3px solid var(--text)' : '2px solid var(--border)',
                        boxShadow: active ? `0 0 0 2px ${t.swatch}55` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FIELD_DEFS.map((fd) => (
                <label key={fd.key} className="ui-input-wrap" style={{ gridColumn: fd.full ? '1 / -1' : 'auto' }}>
                  <span className="ui-input-label">{fd.label}</span>
                  {fd.textarea ? (
                    <textarea
                      className="ui-input"
                      rows={3}
                      value={(form[fd.key] as string) || ''}
                      placeholder={fd.placeholder}
                      onChange={(e) => setField(fd.key, e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      className="ui-input"
                      value={(form[fd.key] as string) || ''}
                      placeholder={fd.placeholder}
                      onChange={(e) => setField(fd.key, e.target.value)}
                    />
                  )}
                </label>
              ))}

              <label className="ui-input-wrap" style={{ gridColumn: '1 / -1' }}>
                <span className="ui-input-label">Highlight chips (comma-separated)</span>
                <input
                  className="ui-input"
                  value={highlights}
                  placeholder="Certificate, Free snacks, Limited seats"
                  onChange={(e) => setHighlights(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <style>{`.ui-spin { animation: uiSpin 0.9s linear infinite; } @keyframes uiSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
