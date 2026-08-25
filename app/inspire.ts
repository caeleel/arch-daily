import { InspireImage } from './types';

const DAY_KEY = 'inspire_day';
const PAGE_KEY = 'inspire_page';
const CURSOR_KEY = 'inspire_cursor';
const CACHE_KEY = 'inspire_cache';

// How many images to keep around from previous API calls
const MAX_CACHED_IMAGES = 60;

interface InspireState {
  day: string;
  page: number;
  cursor: number;
  cache: InspireImage[];
}

// Local calendar day, e.g. "2026-8-21"
function todayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function readState(): InspireState {
  const empty: InspireState = { day: '', page: 0, cursor: 0, cache: [] };

  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');

    return {
      day: localStorage.getItem(DAY_KEY) || '',
      page: parseInt(localStorage.getItem(PAGE_KEY) || '0', 10) || 0,
      cursor: parseInt(localStorage.getItem(CURSOR_KEY) || '0', 10) || 0,
      cache: Array.isArray(cache) ? cache : []
    };
  } catch {
    return empty;
  }
}

function writeState(state: InspireState): void {
  try {
    localStorage.setItem(DAY_KEY, state.day);
    localStorage.setItem(PAGE_KEY, String(state.page));
    localStorage.setItem(CURSOR_KEY, String(state.cursor));
    localStorage.setItem(CACHE_KEY, JSON.stringify(state.cache));
  } catch {
    // Storage unavailable (private mode, quota) - the page still works, it
    // just fetches a fresh image on every landing.
  }
}

async function fetchPage(page: number): Promise<InspireImage[]> {
  const params = new URLSearchParams({
    inspireme_id: new Date().toString(),
    page: String(page)
  });

  const response = await fetch(`https://nrd.adsttc.com/api/v1/fetch-images/us?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch images');
  }

  const data = await response.json();
  if (!Array.isArray(data?.images) || data.images.length === 0) {
    throw new Error('No images returned');
  }

  return data.images;
}

// The image currently being shown, plus its position in the cache
export interface InspireView {
  image: InspireImage | null;
  index: number;
}

function viewOf(state: InspireState): InspireView {
  return {
    image: state.cache[state.cursor - 1] || null,
    index: Math.max(0, state.cursor - 1)
  };
}

// The image shown on the most recent landing, if any.
export function currentView(): InspireView {
  return viewOf(readState());
}

// Step back to the previously shown image. Purely local - it never fetches,
// and it stops at the oldest image still in the cache.
export function previousImage(): InspireView {
  const state = readState();

  if (state.cursor > 1) {
    state.cursor -= 1;
    writeState(state);
  }

  return viewOf(state);
}

// Advance one image: serve from the cache when the current page still has
// images left, otherwise fetch the next page and cache it.
export async function nextImage(): Promise<InspireView> {
  const state = readState();

  // A new day starts over at page 1 with a fresh inspireme_id
  if (state.day !== todayKey()) {
    state.day = todayKey();
    state.page = 0;
  }

  if (state.cursor >= state.cache.length) {
    const page = state.page + 1;
    const images = await fetchPage(page);

    state.page = page;
    state.cache = state.cache.concat(images);

    // Keep only the last N images, moving the cursor with them
    const overflow = state.cache.length - MAX_CACHED_IMAGES;
    if (overflow > 0) {
      state.cache = state.cache.slice(overflow);
      state.cursor = Math.max(0, state.cursor - overflow);
    }
  }

  if (state.cache[state.cursor]) {
    state.cursor += 1;
  }

  writeState(state);
  return viewOf(state);
}
