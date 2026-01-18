import { StoredProject, SlideshowMetadata } from './types';

const DB_NAME = 'arch-daily-slideshow';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'articleId' });
        store.createIndex('viewedAt', 'viewedAt', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };
  });
}

export async function saveProject(metadata: SlideshowMetadata): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  // Check if project already exists
  const existing = await new Promise<StoredProject | undefined>((resolve) => {
    const request = store.get(metadata.articleId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });

  const project: StoredProject = {
    articleId: metadata.articleId,
    nonce: metadata.nonce,
    title: metadata.title,
    thumbnail: metadata.thumbnail,
    viewedAt: Date.now(),
    isFavorite: existing?.isFavorite || false
  };

  store.put(project);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function toggleFavorite(articleId: string): Promise<boolean> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const project = await new Promise<StoredProject | undefined>((resolve) => {
    const request = store.get(articleId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });

  if (!project) {
    db.close();
    return false;
  }

  project.isFavorite = !project.isFavorite;
  store.put(project);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve(project.isFavorite);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function isFavorite(articleId: string): Promise<boolean> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.get(articleId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.isFavorite || false);
    };
    request.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

export async function getRecents(limit: number, offset: number = 0): Promise<StoredProject[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('viewedAt');

  return new Promise((resolve) => {
    const projects: StoredProject[] = [];
    let skipped = 0;

    const request = index.openCursor(null, 'prev'); // Sort by viewedAt descending

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor && projects.length < limit) {
        if (skipped < offset) {
          skipped++;
          cursor.continue();
        } else {
          projects.push(cursor.value);
          cursor.continue();
        }
      } else {
        db.close();
        resolve(projects);
      }
    };

    request.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

export async function getFavorites(): Promise<StoredProject[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('viewedAt');

  return new Promise((resolve) => {
    const projects: StoredProject[] = [];

    const request = index.openCursor(null, 'prev'); // Sort by viewedAt descending

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        if (cursor.value.isFavorite) {
          projects.push(cursor.value);
        }
        cursor.continue();
      } else {
        db.close();
        resolve(projects);
      }
    };

    request.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}
