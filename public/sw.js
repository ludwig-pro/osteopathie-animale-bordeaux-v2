const clearKnownCaches = async () => {
  try {
    const cacheNames = await caches.keys();
    await Promise.allSettled(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
  } catch (_error) {
    // Unregistering this legacy worker is more important than cache cleanup.
  }
};

const claimClients = async () => {
  try {
    await self.clients.claim();
  } catch (_error) {
    // Continue with unregistering even if a browser refuses client claiming.
  }
};

const unregisterWorker = async () => {
  try {
    await self.registration.unregister();
  } catch (_error) {
    // Nothing else can repair a failed unregister from inside this worker.
  }
};

const reloadClients = async () => {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    await Promise.allSettled(
      clients.map(async (client) => {
        if ('navigate' in client) {
          await client.navigate(client.url);
        }
      })
    );
  } catch (_error) {
    // Cleanup already ran; avoid failing activation because a reload failed.
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await claimClients();
      await clearKnownCaches();
      await unregisterWorker();
      await reloadClients();
    })()
  );
});
