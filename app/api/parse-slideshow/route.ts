import { NextRequest, NextResponse } from 'next/server';
import { SlideImage, buildArticleUrl } from '@/app/types';

// ArchDaily serves gallery images from a CDN path whose second-to-last segment
// is a size bucket, e.g. .../2000/045c/medium_jpg/13_White_House.jpg. Swapping
// that segment is how we get other resolutions of the same photo.
const SIZE_SEGMENT = /\/(thumb_jpg|medium_jpg|large_jpg|slideshow|newsletter)\/(?=[^/]+$)/;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Pull the numeric article id out of any ArchDaily URL shape: a bare id, a
// base article URL, or an old slideshow/photo URL.
function extractArticleId(input: string): string | null {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!/(^|\.)archdaily\.com$/.test(url.hostname)) return null;
    // Some locales prefix the path, e.g. /en/923364/slug - take the first
    // segment that is all digits.
    const digits = url.pathname.split('/').filter(Boolean).find(p => /^\d+$/.test(p));
    return digits ?? null;
  } catch {
    return null;
  }
}

function getAttr(tag: string, name: string): string | null {
  const match =
    tag.match(new RegExp(`\\b${name}='([^']*)'`)) ||
    tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? match[1] : null;
}

function decodeHtmlEntities(text: string): string {
  const named: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' '
  };

  return text
    .replace(/&[a-z]+;/gi, m => named[m.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

// The gallery lives in the article page markup as plain <img> tags. Most are
// lazy-loaded, so the real URL is in data-src and `src` is a placeholder GIF.
function extractImages(html: string): SlideImage[] {
  const images: SlideImage[] = [];
  const seen = new Set<string>();

  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    const src = getAttr(tag, 'data-src') || getAttr(tag, 'src');
    if (!src || !src.includes('/media/images/')) continue;

    // The firm/author avatars live on the same CDN but are not gallery images.
    if ((getAttr(tag, 'class') || '').includes('profile__avatar')) continue;

    const sizeMatch = src.match(SIZE_SEGMENT);
    if (!sizeMatch) continue;

    // The `newsletter` bucket is the social/cover rendering of an image that
    // already appears in the gallery under its own id.
    if (sizeMatch[1] === 'newsletter') continue;

    // Cache-busting query strings differ between size buckets, so drop them
    // before using the path as an identity.
    const clean = src.split('?')[0];
    const key = clean.replace(SIZE_SEGMENT, '/');
    if (seen.has(key)) continue;
    seen.add(key);

    images.push({
      url_large: clean.replace(SIZE_SEGMENT, '/large_jpg/'),
      url_medium: clean.replace(SIZE_SEGMENT, '/medium_jpg/'),
      image_alt: decodeHtmlEntities(getAttr(tag, 'alt') || '')
    });
  }

  return images;
}

function extractTitle(html: string): string {
  // Inline <svg><title> elements follow the document title, so take the first.
  const match = html.match(/<title>([^<]+)<\/title>/);
  if (!match) return 'Untitled';
  return decodeHtmlEntities(match[1]).replace(/\s*\|\s*ArchDaily\s*$/i, '').trim() || 'Untitled';
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const articleId = extractArticleId(url);
    if (!articleId) {
      return NextResponse.json(
        { error: 'Not a recognizable ArchDaily project URL' },
        { status: 400 }
      );
    }

    // A bare article id redirects to the canonical slug URL, so we never need
    // to know the slug ourselves.
    const response = await fetch(buildArticleUrl(articleId), {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow'
    });

    if (!response.ok) {
      // Surface the real status - when ArchDaily changes how it gates these
      // pages, a bare "not found" sends you hunting in the wrong place.
      return NextResponse.json(
        { error: `ArchDaily returned HTTP ${response.status} for article ${articleId}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const images = extractImages(html);

    if (images.length === 0) {
      return NextResponse.json(
        { error: `No gallery images found in article ${articleId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      images,
      metadata: {
        articleId,
        title: extractTitle(html),
        thumbnail: images[0].url_medium
      }
    });
  } catch (error) {
    console.error('Error parsing slideshow:', error);
    return NextResponse.json(
      { error: 'Failed to parse slideshow data' },
      { status: 500 }
    );
  }
}
