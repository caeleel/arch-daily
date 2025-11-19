'use client';

import { useState, useEffect } from 'react';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';

interface SlideImage {
  url_large: string;
  image_alt: string;
  caption: string;
}

// Extract slideshow identifier from ArchDaily URL
// Example: "https://www.archdaily.com/1002775/fake-realness-installation-nultudio-plus-palma/6492388b5921185aa0184e61-fake-realness-installation-nultudio-plus-palma-photo"
// Returns: "1002775-6492388b5921185aa0184e61"
function extractSlideshowId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);

    if (pathParts.length < 3) return null;

    const rootPath = pathParts[0]; // e.g., "1002775"
    const lastPart = pathParts[pathParts.length - 1]; // e.g., "6492388b5921185aa0184e61-fake-realness-installation-nultudio-plus-palma-photo"
    const guidLike = lastPart.split('-')[0]; // e.g., "6492388b5921185aa0184e61"

    return `${rootPath}-${guidLike}`;
  } catch {
    return null;
  }
}

// Reconstruct ArchDaily URL from slideshow identifier
// Example: "1002775-6492388b5921185aa0184e61"
// Returns: "https://www.archdaily.com/1002775/0/6492388b5921185aa0184e61"
function reconstructUrl(slideshowId: string): string | null {
  try {
    const parts = slideshowId.split('-');
    if (parts.length !== 2) return null;

    const [rootPath, guidLike] = parts;
    return `https://www.archdaily.com/${rootPath}/0/${guidLike}`;
  } catch {
    return null;
  }
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<SlideImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Function to fetch slideshow data
  const fetchSlideshow = async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const response = await fetch('/api/parse-slideshow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch slideshow');
      }

      setImages(data.images);

      // Update URL with slideshow identifier
      const slideshowId = extractSlideshowId(targetUrl);
      if (slideshowId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('s', slideshowId);
        window.history.pushState({}, '', newUrl.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Check for 's' query parameter on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slideshowId = params.get('s');

    if (slideshowId) {
      const reconstructedUrl = reconstructUrl(slideshowId);
      if (reconstructedUrl) {
        setUrl(reconstructedUrl);
        fetchSlideshow(reconstructedUrl);
      }
    } else {
      setInitialLoad(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    await fetchSlideshow(url);
  };

  // Show loading screen if we're loading from a query parameter
  if (initialLoad && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full animate-progress" style={{
            animation: 'progress 2s ease-in-out infinite',
          }} />
        </div>
        <style jsx>{`
          @keyframes progress {
            0% {
              width: 0%;
            }
            50% {
              width: 70%;
            }
            100% {
              width: 100%;
            }
          }
          .animate-progress {
            animation: progress 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      {images.length === 0 ? (
        <div className="w-full max-w-2xl">
          <form onSubmit={handleSubmit} className="flex items-center">
            {/* Link Icon */}
            <div className="text-foreground opacity-60 mr-3">
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
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            </div>

            <div className="flex flex-1">
              {/* Input Field */}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter Arch Daily slideshow URL..."
                className="flex-1 px-4 py-2 border-t border-b border-l border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-0"
                disabled={loading}
              />

              {/* Generate Button */}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold transition-colors focus:outline-none flex items-center justify-center min-w-[120px] border-l border-l-gray-700"
              >
                {loading ? (
                  <div className="w-5 h-5">
                    <LoadingSpinner />
                  </div>
                ) : (
                  'Generate'
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}
        </div>
      ) : (
        <Slideshow images={images} onBack={() => {
          setImages([]);
          // Clear the 's' query parameter from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('s');
          window.history.pushState({}, '', newUrl.toString());
        }} />
      )}
    </div>
  );
}
