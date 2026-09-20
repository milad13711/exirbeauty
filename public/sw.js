// حداقل Service Worker برای امکان نصب اپ؛ کش آفلاین در فاز بک‌اند اضافه می‌شود
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
