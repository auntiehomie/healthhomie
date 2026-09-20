import { useEffect, useState } from "react";
import { Platform } from "react-native";

type Listener = () => void;

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<Listener>();

let reloaded = false;
function reloadOnce(): void {
  if (reloaded) return;
  reloaded = true;
  window.location.reload();
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function setWaitingWorker(worker: ServiceWorker | null): void {
  waitingWorker = worker;
  notify();
}

export function applyUpdate(): void {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
  // The reload is normally driven by the 'controllerchange' listener below, once the new worker
  // actually takes control. That message can silently go nowhere if the referenced worker has
  // already gone stale (redundant) by the time this fires — a known flaky spot in the service
  // worker lifecycle, especially on iOS Safari — so force a reload if nothing happened shortly
  // after tapping Refresh, rather than leaving the user stuck looking at an unresponsive button.
  setTimeout(() => reloadOnce(), 2000);
}

let registered = false;

/** Web-only. Registers the service worker and watches for a new version becoming available. */
export function registerServiceWorker(): void {
  if (Platform.OS !== "web") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  if (registered) return;
  registered = true;

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      if (registration.waiting && registration.active)
        setWaitingWorker(registration.waiting);

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // A worker in "installed" state alongside an existing controller means this is an
          // update, not the very first install — that's the case we want to surface.
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(registration.waiting);
          }
        });
      });

      // iOS Safari's automatic update check for home-screen-installed PWAs is unreliable —
      // standalone-mode service workers don't consistently get re-checked on navigation the way
      // Chrome/desktop does, so a device can sit on a stale build indefinitely with no banner
      // ever appearing. Force an explicit check right after registering and every time the app
      // comes back to the foreground (the most common "did a new version ship while I was away"
      // moment), instead of relying solely on the browser to notice on its own.
      void registration.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible")
          void registration.update().catch(() => {});
      });
    })
    .catch(() => {});

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);
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
