import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  images: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
};

/** Full-screen image viewer with keyboard + arrow navigation. */
export function ImageLightbox({ images, index, onClose, onIndex }: Props) {
  const prev = () => onIndex((index - 1 + images.length) % images.length);
  const next = () => onIndex((index + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  const multi = images.length > 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <button onClick={onClose} style={btn({ top: 18, right: 18 })}><X size={22} /></button>

        {multi && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} style={btn({ left: 18 })}><ChevronLeft size={26} /></button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} style={btn({ right: 18 })}><ChevronRight size={26} /></button>
          </>
        )}

        <motion.img
          key={index}
          src={images[index]}
          alt=""
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        />

        {multi && (
          <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: 999 }}>
            {index + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function btn(pos: { top?: number; bottom?: number; left?: number; right?: number }): React.CSSProperties {
  return {
    position: 'absolute', ...pos, transform: pos.left || pos.right ? (pos.top ? 'none' : 'translateY(-50%)') : 'none',
    top: pos.top ?? (pos.left || pos.right ? '50%' : undefined),
    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.14)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001,
  };
}
