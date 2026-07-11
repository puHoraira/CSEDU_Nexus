import { X } from 'lucide-react';
import { PosterData } from '../../lib/posterGenerator';
import { PosterGenerator } from './PosterGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PosterData;
}

export function PosterGeneratorModal({ isOpen, onClose, data }: Props) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94%',
          maxWidth: '980px',
          maxHeight: '92vh',
          overflowY: 'auto',
          zIndex: 1000,
          animation: 'scaleIn 0.2s ease',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '-12px',
              right: '-12px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--panel-strong)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              boxShadow: 'var(--shadow)',
            }}
          >
            <X size={20} />
          </button>

          <PosterGenerator data={data} />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
