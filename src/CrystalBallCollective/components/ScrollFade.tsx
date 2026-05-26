// Bottom scroll affordance. Listens to scroll on the nearest ancestor
// scroll container (defaults to the .cbc-app root) and toggles a
// `is-bottom` class so the fade dims out when the user has reached the end.
// Also hides itself when the container isn't actually scrollable.

import { useEffect, useRef, useState } from 'react';

export function ScrollFade({
  containerSelector = '.cbc-app',
}: { containerSelector?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    const el = document.querySelector(containerSelector) as HTMLElement | null;
    if (!el) return;

    const check = () => {
      const overflow = el.scrollHeight - el.clientHeight;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      setNeeded(overflow > 24);
      if (ref.current) {
        ref.current.classList.toggle('is-bottom', atBottom || overflow <= 24);
      }
    };

    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // Re-check after a tick in case fonts/images shifted heights.
    const id = window.setTimeout(check, 400);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
      window.clearTimeout(id);
    };
  }, [containerSelector]);

  if (!needed) return null;

  return (
    <div ref={ref} className="cbc-app__scroll-fade" aria-hidden>
      <span className="cbc-app__scroll-chevron">▾</span>
    </div>
  );
}
