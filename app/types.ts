export interface SlideImage {
  url_large: string;
  url_medium: string;
  image_alt: string;
  caption: string;
}

export interface SlideshowMetadata {
  articleId: string;
  nonce: string;
  title: string;
  thumbnail: string;
}

export interface SlideshowResponse {
  images: SlideImage[];
  metadata: SlideshowMetadata;
}

export interface StoredProject {
  articleId: string;
  nonce: string;
  title: string;
  thumbnail: string;
  viewedAt: number;
  isFavorite: boolean;
}

// Build slideshow URL from article ID and nonce
// Example: buildSlideshowUrl("1002775", "6492388b5921185aa0184e61")
// Returns: "https://www.archdaily.com/1002775/0/6492388b5921185aa0184e61"
export function buildSlideshowUrl(articleId: string, nonce: string): string {
  return `https://www.archdaily.com/${articleId}/0/${nonce}`;
}
