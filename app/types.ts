export interface SlideImage {
  url_large: string;
  url_medium: string;
  image_alt: string;
}

export interface SlideshowMetadata {
  articleId: string;
  title: string;
  thumbnail: string;
}

export interface SlideshowResponse {
  images: SlideImage[];
  metadata: SlideshowMetadata;
}

export interface StoredProject {
  articleId: string;
  title: string;
  thumbnail: string;
  viewedAt: number;
  isFavorite: boolean;
}

// Build an article URL from its id. A bare id redirects to the canonical slug
// URL, so the slug never has to be stored or guessed.
// Example: buildArticleUrl("923364") -> "https://www.archdaily.com/923364"
export function buildArticleUrl(articleId: string): string {
  return `https://www.archdaily.com/${articleId}`;
}

// Projects used to be identified by an article id plus a gallery nonce, shared
// as "<articleId>-<nonce>". Only the article id is needed now, but old links
// and stored records still carry the nonce.
export function parseProjectParam(value: string): string | null {
  const articleId = value.split('-')[0];
  return /^\d+$/.test(articleId) ? articleId : null;
}

// Image from the ArchDaily "inspire me" API used on the landing page
export interface InspireImage {
  image_id: string;
  image_url: string;
  image_caption: string;
  project_url: string;
  project_title: string;
}
