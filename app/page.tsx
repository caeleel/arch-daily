'use client';

import { useState, useEffect, useRef } from 'react';
import Slideshow from './components/Slideshow';
import Nav from './components/Nav';
import { SlideImage, SlideshowMetadata, buildArticleUrl, parseProjectParam } from '@/app/types';
import { InspireView, nextImage, previousImage, currentView } from '@/app/inspire';
import { saveProject } from '@/app/storage';

interface Viewer {
  images: SlideImage[];
  metadata: SlideshowMetadata;
}

export default function Daily() {
  const [url, setUrl] = useState('');
  const [view, setView] = useState<InspireView | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const started = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Fade a newly shown image in. Stepping back lands on an image the browser
  // has already cached, which can finish loading before React attaches onLoad,
  // so check `complete` rather than waiting for an event that never fires.
  useEffect(() => {
    setImageLoaded(imageRef.current?.complete ?? false);
  }, [view?.image?.image_id]);

  // Pull the next image: served from the local cache when one is left over
  // from the current page, otherwise fetched from the API.
  const showNext = async () => {
    setAdvancing(true);
    setError(null);

    try {
      const next = await nextImage();
      setView(next);
      if (!next.image) {
        setError('No image available right now.');
      }
    } catch {
      // Offline or the API is down - fall back to the last image we showed
      const previous = currentView();
      if (previous.image) {
        setView(previous);
      } else {
        setError('Could not reach ArchDaily. Try again in a moment.');
      }
    } finally {
      setAdvancing(false);
    }
  };

  const showPrevious = () => {
    setError(null);
    setView(previousImage());
  };

  // Open a project in the slideshow viewer
  const openProject = async (targetUrl: string) => {
    setViewerLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-slideshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch slideshow');
      }

      setViewer({ images: data.images, metadata: data.metadata });
      await saveProject(data.metadata);

      // Keep the slideshow shareable via the 's' query parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('s', data.metadata.articleId);
      window.history.pushState({}, '', newUrl.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setViewerLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    openProject(url);
  };

  // A shared link (?s=...) opens straight into the viewer, otherwise show
  // today's image.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const slideshowId = params.get('s');
    const articleId = slideshowId ? parseProjectParam(slideshowId) : null;

    if (articleId) {
      openProject(buildArticleUrl(articleId));
    } else {
      showNext();
    }
  }, []);

  const handleBack = () => {
    setViewer(null);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('s');
    window.history.pushState({}, '', newUrl.toString());

    // Arrived through a shared link, so there is no daily image behind it yet
    if (!view) {
      showNext();
    }
  };

  if (viewer) {
    return <Slideshow images={viewer.images} metadata={viewer.metadata} onBack={handleBack} />;
  }

  const image = view?.image ?? null;
  const busy = advancing || viewerLoading;
  const canGoBack = !!image && view!.index > 0;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {image && (
        <img
          key={image.image_id}
          ref={imageRef}
          src={image.image_url}
          alt={image.project_title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Slight scrim so the white UI stays legible over bright images */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* Loading bar, shown while fetching the image or parsing a project */}
      {(busy || (!image && !error)) && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 bg-white animate-loading-bar" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <div className="text-white text-sm text-center">
            {error}
            {image && (
              <a
                href={image.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 underline underline-offset-4 hover:text-gray-300"
              >
                Open on ArchDaily
              </a>
            )}
          </div>
        </div>
      )}

      {/* Project title, top left */}
      {image && (
        <div className="absolute inset-x-0 top-0">
          <div className="px-10 pt-8">
            <button
              onClick={() => openProject(image.project_url)}
              disabled={busy}
              className="text-left text-white font-bold cursor-pointer disabled:underline disabled:underline-offset-4 disabled:cursor-default"
            >
              <div className="text-lg leading-tight">{image.project_title}</div>
              {image.image_caption && (
                <div className="text-white text-xs font-normal leading-tight mt-1">
                  {image.image_caption}
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar: link generation on the left, navigation on the right */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="flex items-end justify-between gap-6 px-10 pb-8">
          <form
            onSubmit={handleSubmit}
            className="flex items-stretch border border-white text-white font-bold"
          >
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an ArchDaily link"
              disabled={busy}
              className="h-9 w-56 sm:w-80 px-4 bg-transparent text-sm placeholder:text-white/60 placeholder:font-normal focus:outline-none"
            />

            <button
              type="submit"
              disabled={busy}
              className="flex items-center h-9 px-4 border-l border-white text-sm cursor-pointer hover:bg-white/10 disabled:text-gray-500 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
            >
              Generate slideshow
            </button>
          </form>

          <Nav
            page="daily"
            onPrevious={showPrevious}
            onNext={showNext}
            canGoBack={canGoBack}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}
