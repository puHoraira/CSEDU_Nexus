import { useState } from 'react';
import { PosterData } from '../lib/posterGenerator';
import { PosterGeneratorModal } from '../components/poster/PosterGeneratorModal';

export function usePosterGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [posterData, setPosterData] = useState<PosterData | null>(null);

  const openPosterGenerator = (data: PosterData) => {
    setPosterData(data);
    setIsOpen(true);
  };

  const closePosterGenerator = () => {
    setIsOpen(false);
    setPosterData(null);
  };

  const PosterModal = posterData ? (
    <PosterGeneratorModal
      isOpen={isOpen}
      onClose={closePosterGenerator}
      data={posterData}
    />
  ) : null;

  return {
    openPosterGenerator,
    closePosterGenerator,
    PosterModal,
  };
}
