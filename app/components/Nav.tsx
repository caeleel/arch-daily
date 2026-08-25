'use client';

import Link from 'next/link';

interface NavProps {
  page: 'daily' | 'history';
  onPrevious?: () => void;
  onNext?: () => void;
  canGoBack?: boolean;
  busy?: boolean;
}

export default function Nav({
  page,
  onPrevious,
  onNext,
  canGoBack = false,
  busy = false
}: NavProps) {
  const daily = page === 'daily';

  // White over the photo, black over the history page (inverted in dark mode)
  const edge = daily ? 'border-white' : 'border-black dark:border-white';

  // Fixed cell width keeps the two columns even and aligned under the arrows
  const cell = 'flex items-center justify-center h-9 w-24 transition-colors';

  const dormant = daily
    ? 'text-white hover:bg-white/10'
    : 'text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10';

  // The active label is knocked out of its solid background: `screen` leaves
  // the white box opaque and turns the pure black glyphs into whatever the
  // photo behind them is showing.
  const active = daily
    ? 'bg-white text-black mix-blend-screen'
    : 'bg-black text-white dark:bg-white dark:text-black';

  const arrow = `${cell} ${dormant} ${edge} text-lg leading-none font-bold cursor-pointer disabled:text-gray-500 disabled:cursor-default disabled:hover:bg-transparent`;
  const label = `${cell} text-sm`;

  return (
    <div className={`grid grid-cols-2 border ${edge}`}>
      {/* Arrows step through the cached images - daily page only */}
      {daily && (
        <>
          <button
            onClick={onPrevious}
            disabled={!canGoBack || busy}
            className={`${arrow} border-r border-b`}
            aria-label="Previous image"
          >
            &larr;
          </button>

          <button
            onClick={onNext}
            disabled={busy}
            className={`${arrow} border-b`}
            aria-label="Next image"
          >
            &rarr;
          </button>
        </>
      )}

      {daily ? (
        <span className={`${label} ${active} ${edge} border-r font-bold`}>Daily</span>
      ) : (
        <Link
          href="/"
          className={`${label} ${dormant} ${edge} border-r font-normal cursor-pointer`}
        >
          Daily
        </Link>
      )}

      {daily ? (
        <Link
          href="/history"
          className={`${label} ${dormant} font-normal cursor-pointer`}
        >
          History
        </Link>
      ) : (
        <span className={`${label} ${active} font-bold`}>History</span>
      )}
    </div>
  );
}
