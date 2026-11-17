import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'explorer' }
  | { name: 'preview'; id: string }
  | { name: 'playground'; id: string }
  | { name: 'not-found' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'explorer' };
  const match = /^\/challenge\/([^/]+)(\/play)?$/.exec(path);
  if (match) {
    const id = decodeURIComponent(match[1]!);
    return match[2] ? { name: 'playground', id } : { name: 'preview', id };
  }
  return { name: 'not-found' };
}

export const paths = {
  explorer: () => '/',
  preview: (id: string) => `/challenge/${encodeURIComponent(id)}`,
  playground: (id: string) => `/challenge/${encodeURIComponent(id)}/play`,
};

export function navigate(path: string): void {
  window.location.hash = path;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
