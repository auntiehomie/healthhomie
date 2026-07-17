import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type Listener = () => void;

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function setWaitingWorker(worker: ServiceWorker | null): void {
  waitingWorker = worker;
  notify();
}

export function applyUpdate(): void {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
}

/** Web-only. Registers the service worker and watches for a new version becoming available. */
export function registerServiceWorker(): void {
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      if (registration.waiting && registration.active) setWaitingWorker(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          // A worker in "installed" state alongside an existing controller means this is an
          // update, not the very first install — that's the case we want to surface.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting);
          }
        });
      });
    })
    .catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(waitingWorker !== null);

  useEffect(() => {
    const listener = () => setAvailable(waitingWorker !== null);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return available;
}
