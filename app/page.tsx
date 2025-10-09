'use client';

import { useState } from 'react';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';

interface SlideImage {
  url_large: string;
  image_alt: string;
  caption: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<SlideImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setImages([]);

    try {
      const response = await fetch('/api/parse-slideshow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch slideshow');
      }

      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        <Slideshow images={images} onBack={() => setImages([])} />
      )}
    </div>
  );
}
