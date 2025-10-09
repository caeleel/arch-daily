import { NextRequest, NextResponse } from 'next/server';

interface SlideImage {
  url_large: string;
  image_alt: string;
  caption: string;
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
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Fetch the HTML from the provided URL
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL' },
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
      image_alt: img.image_alt,
      caption: img.caption
    }));

    return NextResponse.json({ images });

  } catch (error) {
    console.error('Error parsing slideshow:', error);
    return NextResponse.json(
      { error: 'Failed to parse slideshow data' },
      { status: 500 }
    );
  }
}
