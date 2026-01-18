'use client';

import { useState, useEffect, useCallback } from 'react';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';
import { SlideImage, SlideshowMetadata, StoredProject, buildSlideshowUrl } from '@/app/types';
import { saveProject, getRecents, getFavorites } from '@/app/storage';

const RECENTS_PAGE_SIZE = 24;

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<SlideImage[]>([]);
  const [metadata, setMetadata] = useState<SlideshowMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const [activeTab, setActiveTab] = useState<'recents' | 'favorites'>('recents');
  const [recents, setRecents] = useState<StoredProject[]>([]);
  const [favorites, setFavorites] = useState<StoredProject[]>([]);
  const [recentsOffset, setRecentsOffset] = useState(0);
  const [hasMoreRecents, setHasMoreRecents] = useState(false);

  // Load recents and favorites
  const loadProjects = useCallback(async () => {
    const [recentsList, favoritesList] = await Promise.all([
      getRecents(RECENTS_PAGE_SIZE, 0),
      getFavorites()
    ]);
    setRecents(recentsList);
    setFavorites(favoritesList);
    setRecentsOffset(0);
    setHasMoreRecents(recentsList.length === RECENTS_PAGE_SIZE);
  }, []);

  // Load more recents
  const loadMoreRecents = async () => {
    const newOffset = recentsOffset + RECENTS_PAGE_SIZE;
    const moreRecents = await getRecents(RECENTS_PAGE_SIZE, newOffset);
    setRecents(prev => [...prev, ...moreRecents]);
    setRecentsOffset(newOffset);
    setHasMoreRecents(moreRecents.length === RECENTS_PAGE_SIZE);
  };

  // Function to fetch slideshow data
  const fetchSlideshow = async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    setImages([]);
    setMetadata(null);

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
      setMetadata(data.metadata);

      // Save to storage
      await saveProject(data.metadata);

      // Update URL with slideshow identifier
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('s', `${data.metadata.articleId}-${data.metadata.nonce}`);
      window.history.pushState({}, '', newUrl.toString());
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
      const parts = slideshowId.split('-');
      if (parts.length === 2) {
        const reconstructedUrl = buildSlideshowUrl(parts[0], parts[1]);
        setUrl(reconstructedUrl);
        fetchSlideshow(reconstructedUrl);
      }
    } else {
      setInitialLoad(false);
      loadProjects();
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

  const handleBack = () => {
    setImages([]);
    setMetadata(null);
    // Clear the 's' query parameter from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('s');
    window.history.pushState({}, '', newUrl.toString());
    // Reload projects to reflect any changes
    loadProjects();
  };

  const handleTileClick = (project: StoredProject) => {
    const projectUrl = buildSlideshowUrl(project.articleId, project.nonce);
    setUrl(projectUrl);
    fetchSlideshow(projectUrl);
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

  if (images.length > 0 && metadata) {
    return (
      <Slideshow images={images} metadata={metadata} onBack={handleBack} />
    );
  }

  const displayedProjects = activeTab === 'recents' ? recents : favorites;

  return (
    <div className="min-h-screen bg-background">
      {/* URL Bar at Top */}
      <div className="sticky top-0 bg-background z-10 px-8 pt-8 pb-8 border-b border-black/10">
        <form onSubmit={handleSubmit} className="flex items-center max-w-4xl mx-auto">
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
              placeholder="Enter Arch Daily URL..."
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
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg max-w-4xl mx-auto">
            {error}
          </div>
        )}
      </div>

      {/* Tab Selector */}
      <div className="px-8 py-4 max-w-4xl mx-auto">
        <div className="flex">
          <button
            onClick={() => setActiveTab('recents')}
            className={`px-8 py-2 font-medium transition-colors ${activeTab === 'recents'
              ? 'text-white bg-black dark:text-black dark:bg-white'
              : 'text-gray-500 hover:text-foreground'
              }`}
          >
            Recents
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-8 py-2 font-medium transition-colors ${activeTab === 'favorites'
              ? 'text-white bg-black dark:text-black dark:bg-white'
              : 'text-gray-500 hover:text-foreground'
              }`}
          >
            Favorites
          </button>
        </div>
      </div>

      {/* Tile Grid */}
      <div className="px-8 pb-8 max-w-4xl mx-auto">
        {displayedProjects.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {activeTab === 'recents'
              ? 'No recent projects yet. Enter a URL above to get started!'
              : 'No favorites yet. Heart a project to save it here!'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayedProjects.map((project) => (
                <button
                  key={project.articleId}
                  onClick={() => handleTileClick(project)}
                  className="group relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden hover:ring-2 hover:ring-black dark:hover:ring-white transition-all"
                >
                  {project.thumbnail && (
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Title overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="text-white text-xs leading-tight line-clamp-2 text-left">
                      {project.title}
                    </div>
                  </div>
                  {/* Favorite indicator */}
                  {project.isFavorite && (
                    <div className="absolute top-2 right-2 text-white drop-shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Load More Button (only for recents) */}
            {activeTab === 'recents' && hasMoreRecents && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMoreRecents}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
