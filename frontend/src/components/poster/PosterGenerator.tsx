import { useState } from 'react';
import { Download, FileImage, FileText, Share2 } from 'lucide-react';
import { PosterData, generatePoster, downloadPoster, downloadPosterAsPDF } from '../../lib/posterGenerator';
import toast from 'react-hot-toast';

interface Props {
  data: PosterData;
  onClose?: () => void;
}

export function PosterGenerator({ data, onClose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGeneratePreview = async () => {
    setLoading(true);
    try {
      const imageData = await generatePoster(data);
      setPreview(imageData);
      toast.success('Poster generated successfully!');
    } catch (error) {
      console.error('Error generating poster:', error);
      toast.error('Failed to generate poster');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPNG = async () => {
    setLoading(true);
    try {
      await downloadPoster(data, `${data.type}-${data.title.replace(/\s+/g, '-').toLowerCase()}.png`);
      toast.success('Poster downloaded as PNG!');
    } catch (error) {
      console.error('Error downloading poster:', error);
      toast.error('Failed to download poster');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      await downloadPosterAsPDF(data, `${data.type}-${data.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('Poster downloaded as PDF!');
    } catch (error) {
      console.error('Error downloading poster:', error);
      toast.error('Failed to download poster');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!preview) {
      toast.error('Please generate preview first');
      return;
    }

    try {
      // Convert data URL to blob
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], `${data.type}-poster.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: data.title,
          text: `Check out this ${data.type}!`,
          files: [file],
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        toast.success('Poster copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing poster:', error);
      toast.error('Failed to share poster');
    }
  };

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <h3 className="ui-card__title">Generate Poster</h3>
        {onClose && (
          <button onClick={onClose} className="ui-btn ui-btn--ghost ui-btn--sm">
            Close
          </button>
        )}
      </div>

      <div className="ui-card__body">
        {/* Preview */}
        {preview ? (
          <div style={{ marginBottom: '20px' }}>
            <img 
              src={preview} 
              alt="Poster Preview" 
              style={{ 
                width: '100%', 
                maxWidth: '500px', 
                height: 'auto',
                borderRadius: '12px',
                boxShadow: 'var(--shadow)',
                display: 'block',
                margin: '0 auto',
              }} 
            />
          </div>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <FileImage size={48} style={{ color: 'var(--muted)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              Click "Generate Preview" to see your poster
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="ui-flex ui-flex-wrap ui-gap-3">
          <button
            onClick={handleGeneratePreview}
            disabled={loading}
            className="ui-btn ui-btn--primary"
          >
            <FileImage size={18} />
            {loading ? 'Generating...' : 'Generate Preview'}
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={loading || !preview}
            className="ui-btn ui-btn--secondary"
          >
            <Download size={18} />
            Download PNG
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={loading || !preview}
            className="ui-btn ui-btn--secondary"
          >
            <FileText size={18} />
            Download PDF
          </button>

          <button
            onClick={handleShare}
            disabled={loading || !preview}
            className="ui-btn ui-btn--secondary"
          >
            <Share2 size={18} />
            Share
          </button>
        </div>

        {/* Poster Info */}
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface)', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text)' }}>Poster Details</h4>
          <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem', color: 'var(--muted)' }}>
            <div><strong>Type:</strong> {data.type.charAt(0).toUpperCase() + data.type.slice(1)}</div>
            <div><strong>Title:</strong> {data.title}</div>
            <div><strong>Date:</strong> {new Date(data.date).toLocaleDateString()}</div>
            {data.location && <div><strong>Location:</strong> {data.location}</div>}
            {data.theme && <div><strong>Theme:</strong> {data.theme}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
