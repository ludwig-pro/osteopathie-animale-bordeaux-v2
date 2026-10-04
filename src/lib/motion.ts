/** Progressive enhancement: content remains visible without JavaScript. */
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set<Animation>();
const revealed = new WeakSet<Element>();
let observer: IntersectionObserver | undefined;

function reveal(element: HTMLElement) {
  revealed.add(element);
  if (preference.matches || typeof element.animate !== 'function') return;

  const isImage = element.dataset['reveal'] === 'image';
  const isIntro = element.dataset['reveal'] === 'intro';
  const animation = element.animate(
    isImage
      ? [
          { clipPath: 'inset(8% 0 0 0)', transform: 'translateY(24px)' },
          { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' },
        ]
      : [
          { opacity: isIntro ? 1 : 0, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
    { duration: isImage ? 900 : 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  );
  running.add(animation);
  const forget = () => running.delete(animation);
  animation.addEventListener('finish', forget, { once: true });
  animation.addEventListener('cancel', forget, { once: true });
}

function observe() {
  observer?.disconnect();
  if (preference.matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        reveal(entry.target as HTMLElement);
      }
    },
    { threshold: 0.08 }
  );
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
    if (!revealed.has(element)) observer?.observe(element);
  });
}

preference.addEventListener('change', () => {
  for (const animation of running) animation.cancel();
  observe();
});
window.addEventListener('pagehide', () => {
  for (const animation of running) animation.cancel();
});
window.addEventListener('pageshow', observe);
observe();
