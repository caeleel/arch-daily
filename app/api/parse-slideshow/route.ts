import { NextRequest, NextResponse } from 'next/server';
import { SlideImage, buildSlideshowUrl } from '@/app/types';

// Check if URL is a slideshow URL (has nonce in path) or a base article URL
function isSlideshowUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    // Slideshow URLs have 3+ parts: number, slug, nonce-slug-photo
    // Base URLs have 2 parts: number, slug
    return pathParts.length >= 3;
  } catch {
    return false;
  }
}

// Extract article ID from URL
function extractArticleId(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(p => p);
  return pathParts[0];
}

// Extract nonce from base article page HTML
function extractNonceFromHtml(html: string): string | null {
  const match = html.match(/#newsroom-picture-att-id-([a-f0-9]+)\s*\{/);
  return match ? match[1] : null;
}

// Extract nonce from slideshow URL
function extractNonceFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(p => p);
  // Last part is like "6492388b5921185aa0184e61-fake-realness-photo"
  const lastPart = pathParts[pathParts.length - 1];
  return lastPart.split('-')[0];
}

// Extract title from HTML, removing the " - N" suffix
function extractTitle(html: string): string {
  const match = html.match(/<title>([^<]+)<\/title>/);
  if (!match) return 'Untitled';
  // Remove " - 1" or similar suffix from "Gallery of Rooms / Ando Corporation  - 1"
  return match[1].replace(/\s+-\s+\d+$/, '').trim();
}

function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&apos;': "'"
  };

  return text.replace(/&[a-z]+;|&#\d+;/g, (match) => entities[match] || match);
}

export async function POST(request: NextRequest) {
  try {
    let { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    let articleId: string;
    let nonce: string;

    // If this is a base article URL, we need to extract the nonce first
    if (!isSlideshowUrl(url)) {
      const baseResponse = await fetch(url);
      if (!baseResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch article page' },
          { status: 500 }
        );
      }

      const baseHtml = await baseResponse.text();
      const extractedNonce = extractNonceFromHtml(baseHtml);

      if (!extractedNonce) {
        return NextResponse.json(
          { error: 'Could not find slideshow nonce in article page' },
          { status: 404 }
        );
      }

      articleId = extractArticleId(url);
      nonce = extractedNonce;
      url = buildSlideshowUrl(articleId, nonce);
    } else {
      articleId = extractArticleId(url);
      nonce = extractNonceFromUrl(url);
    }

    // Fetch the HTML from the slideshow URL
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch slideshow page' },
        { status: 500 }
      );
    }

    const html = await response.text();

    // Parse the HTML line by line to find data-images attribute
    const lines = html.split('\n');
    let dataImagesLine: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('data-images=')) {
        dataImagesLine = trimmedLine;
        break;
      }
    }

    if (!dataImagesLine) {
      return NextResponse.json(
        { error: 'data-images attribute not found in HTML' },
        { status: 404 }
      );
    }

    // Extract the JSON string from data-images="..."
    const match = dataImagesLine.match(/data-images="([^"]*)"/);
    if (!match || !match[1]) {
      return NextResponse.json(
        { error: 'Failed to extract data-images value' },
        { status: 500 }
      );
    }

    // HTML decode the extracted string
    const decodedJson = decodeHtmlEntities(match[1]);

    // Parse the JSON
    const allImages = JSON.parse(decodedJson);

    // Extract only the fields we need
    const images: SlideImage[] = allImages.map((img: any) => ({
      url_large: img.url_large,
      url_medium: img.url_medium,
      image_alt: img.image_alt,
      caption: img.caption
    }));

    // Extract metadata
    const title = extractTitle(html);
    const thumbnail = allImages[0]?.url_medium || allImages[0]?.url_slideshow || '';

    return NextResponse.json({
      images,
      metadata: {
        articleId,
        nonce,
        title,
        thumbnail
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
