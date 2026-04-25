import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link?: string;
}

interface ImageSliderProps {
  slides: Slide[];
  autoPlayInterval?: number;
}

export function ImageSlider({ slides, autoPlayInterval = 5000 }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length, autoPlayInterval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  if (slides.length === 0) return null;

  return (
    <div className="image-slider">
      <div className="image-slider__container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`image-slider__slide ${index === currentIndex ? "is-active" : ""}`}
            style={{ transform: `translateX(${(index - currentIndex) * 100}%)` }}
          >
            <div className="image-slider__image-wrapper">
              <img src={slide.imageUrl} alt={slide.title} className="image-slider__image" />
              <div className="image-slider__overlay" />
            </div>
            <div className="image-slider__content">
              <h2 className="image-slider__title">{slide.title}</h2>
              <p className="image-slider__description">{slide.description}</p>
              {slide.link && (
                <a href={slide.link} className="primary-button">
                  Learn More
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            className="image-slider__nav image-slider__nav--prev"
            onClick={goToPrevious}
            aria-label="Previous slide"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="image-slider__nav image-slider__nav--next"
            onClick={goToNext}
            aria-label="Next slide"
          >
            <ChevronRight size={24} />
          </button>

          <div className="image-slider__indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`image-slider__indicator ${index === currentIndex ? "is-active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
