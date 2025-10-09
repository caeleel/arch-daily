'use client';

import { useState, useEffect } from 'react';

interface SlideImage {
  url_large: string;
  image_alt: string;
  caption: string;
}

interface SlideshowProps {
  images: SlideImage[];
  onBack: () => void;
}

export default function Slideshow({ images, onBack }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleMouseMove = () => {
    setShowControls(true);

    // Clear existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Set new timeout to hide controls after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    setHideTimeout(timeout);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* Main Image - Centered and Scaled */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={currentImage.url_large}
          alt={currentImage.image_alt}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Controls Layer - Only visible on hover */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>

        {/* Close Button (X) */}
        <button
          onClick={async () => {
            if (isFullscreen) {
              await document.exitFullscreen();
            }
            onBack();
          }}
          className="pointer-events-auto absolute top-6 right-6 bg-black/50 text-white p-2 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,1)]"
          aria-label="Close slideshow"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image Counter */}
        <div className="absolute top-6 left-6 bg-black/50 text-white px-3 py-2 text-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,1)]"
          aria-label="Previous image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="pointer-events-auto absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,1)]"
          aria-label="Next image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {/* Footer Bar with Caption and Fullscreen */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 bg-black/50 px-6 py-3 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-white text-xs leading-tight">
              {currentImage.image_alt}
            </div>
            {currentImage.caption && (
              <div className="text-white/80 text-xs leading-tight mt-0.5">
                {currentImage.caption}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="ml-4 text-white hover:text-white/80 transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
