import { useEffect, useState } from "react";

/**
 * PWA Hooks for React Components
 * 
 * Provides utilities for:
 * - Service worker registration
 * - Offline status detection
 * - Background sync
 * - Push notifications
 * - Cache management
 */

interface ServiceWorkerRegistration {
  active: ServiceWorker | null;
  unregister(): Promise<boolean>;
  update(): Promise<void>;
}

/**
 * Hook to register service worker
 */
export function useServiceWorker() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers not supported");
      return;
    }

    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      setSwRegistration(registration as any);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      // Listen for new service worker
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New service worker available
              setUpdateAvailable(true);
            }
          });
        }
      });
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  };

  const updateServiceWorker = () => {
    if (swRegistration?.active) {
      swRegistration.active.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  return {
    isReady: !!swRegistration,
    updateAvailable,
    updateServiceWorker,
  };
}

/**
 * Hook to detect offline/online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for background sync
 */
export function useBackgroundSync() {
  const [syncSupported, setSyncSupported] = useState(false);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      setSyncSupported(true);
    }
  }, []);

  const requestSync = async (tagName: string) => {
    if (!syncSupported) {
      console.warn("Background Sync not supported");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await ((registration as any).sync as any).register(tagName);
      setSyncPending(true);
      return true;
    } catch (error) {
      console.error("Background sync request failed:", error);
      return false;
    }
  };

  return {
    syncSupported,
    syncPending,
    requestSync,
  };
}

/**
 * Hook for push notifications
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    const isNotificationAPISupported =
      "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(isNotificationAPISupported);

    if (isNotificationAPISupported) {
      getSubscription();
    }
  }, []);

  const getSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const sub = await (registration.pushManager as any).getSubscription();
    setSubscription(sub);
  };

  const subscribeToPushNotifications = async (vapidPublicKey: string) => {
    if (!isSupported) {
      console.warn("Push notifications not supported");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await (registration.pushManager as any).subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return null;
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
    }
  };

  return {
    isSupported,
    subscription,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
  };
}

/**
 * Hook for cache management
 */
export function useCacheManagement() {
  const [cacheSize, setCacheSize] = useState<number>(0);

  useEffect(() => {
    calculateCacheSize();
  }, []);

  const calculateCacheSize = async () => {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      setCacheSize(totalSize);
    } catch (error) {
      console.error("Failed to calculate cache size:", error);
    }
  };

  const clearCache = async (cacheName?: string) => {
    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      setCacheSize(0);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  const getCacheNames = async (): Promise<string[]> => {
    return caches.keys();
  };

  return {
    cacheSize,
    clearCache,
    getCacheNames,
    calculateCacheSize,
  };
}

/**
 * Hook for install prompt
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  return {
    showPrompt,
    installApp,
  };
}

/**
 * Hook for offline data queue
 */
export function useOfflineQueue() {
  const [queuedRequests, setQueuedRequests] = useState<any[]>([]);

  const addToQueue = async (request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
  }) => {
    const db = await openIndexedDB();
    const id = crypto.randomUUID();

    const change = {
      id,
      ...request,
      timestamp: Date.now(),
    };

    await addToStore(db, "offline_changes", change);
    setQueuedRequests((prev) => [...prev, change]);
  };

  const clearQueue = async () => {
    const db = await openIndexedDB();
    const transaction = db.transaction("offline_changes", "readwrite");
    const store = transaction.objectStore("offline_changes");
    store.clear();
    setQueuedRequests([]);
  };

  return {
    queuedRequests,
    addToQueue,
    clearQueue,
  };
}

/**
 * Utility function: Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * IndexedDB helpers
 */
async function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StartupHubDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("offline_changes")) {
        db.createObjectStore("offline_changes", { keyPath: "id" });
      }
    };
  });
}

async function addToStore(db: IDBDatabase, storeName: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
