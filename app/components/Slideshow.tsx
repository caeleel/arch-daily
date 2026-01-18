'use client';

import { useState, useEffect } from 'react';
import { SlideImage, SlideshowMetadata } from '@/app/types';
import { toggleFavorite, isFavorite } from '@/app/storage';

interface SlideshowProps {
  images: SlideImage[];
  metadata: SlideshowMetadata;
  onBack: () => void;
}

export default function Slideshow({ images, metadata, onBack }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const [largeImageLoaded, setLargeImageLoaded] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

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

    // Only set hide timeout if not hovering over controls
    if (!isHoveringControls) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);

      setHideTimeout(timeout);
    }
  };

  const handleControlMouseEnter = () => {
    setIsHoveringControls(true);
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
  };

  const handleControlMouseLeave = () => {
    setIsHoveringControls(false);
    // Start the hide timeout when leaving controls
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

  // Reset large image loaded state when current index changes
  useEffect(() => {
    setLargeImageLoaded(false);
  }, [currentIndex]);

  // Preload all medium resolution images
  useEffect(() => {
    images.forEach((image) => {
      const img = new Image();
      img.src = image.url_medium;
    });
  }, [images]);

  // Load initial favorite state
  useEffect(() => {
    isFavorite(metadata.articleId).then(setIsFavorited);
  }, [metadata.articleId]);

  const handleToggleFavorite = async () => {
    const newState = await toggleFavorite(metadata.articleId);
    setIsFavorited(newState);
  };

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* Medium resolution image - loads first */}
      <div className="absolute inset-0">
        <img
          src={currentImage.url_medium}
          alt={currentImage.image_alt}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Large resolution image - overlays on top when loaded */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        largeImageLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <img
          src={currentImage.url_large}
          alt={currentImage.image_alt}
          className="w-full h-full object-contain"
          onLoad={() => setLargeImageLoaded(true)}
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
          onMouseEnter={handleControlMouseEnter}
          onMouseLeave={handleControlMouseLeave}
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
          onMouseEnter={handleControlMouseEnter}
          onMouseLeave={handleControlMouseLeave}
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
          onMouseEnter={handleControlMouseEnter}
          onMouseLeave={handleControlMouseLeave}
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

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            onMouseEnter={handleControlMouseEnter}
            onMouseLeave={handleControlMouseLeave}
            className="ml-4 text-white hover:text-white/80 transition-colors"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorited ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
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
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
            )}
          </button>

          {/* External Link Button */}
          <a
            href={`https://www.archdaily.com/${metadata.articleId}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleControlMouseEnter}
            onMouseLeave={handleControlMouseLeave}
            className="ml-4 text-white hover:text-white/80 transition-colors"
            aria-label="View on ArchDaily"
          >
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
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            onMouseEnter={handleControlMouseEnter}
            onMouseLeave={handleControlMouseLeave}
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
