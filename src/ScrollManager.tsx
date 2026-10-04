import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const previousDocument = useRef<string | null>(null);
  const positions = useRef(new Map<string, { top: number; left: number }>());

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    const queryOnly = previousDocument.current === pathname + hash && navigationType !== 'POP';
    previousDocument.current = pathname + hash;
    const stored = window.sessionStorage.getItem(`scroll:${key}`);
    const saved = stored ? JSON.parse(stored) as { top: number; left: number } : undefined;
    const historySaved = window.history.state?.__portfolioScroll as { top: number; left: number } | undefined;
    const restoreTarget = queryOnly ? {top:window.scrollY,left:window.scrollX} : !hash && navigationType === 'POP' ? historySaved ?? saved ?? positions.current.get(key) : undefined;
    let listening = false;
    let frame = 0;
    let saveTimer = 0;
    let committedPosition = { top: window.scrollY, left: window.scrollX };
    let pendingPosition: { top: number; left: number } | undefined;
    let attempts = 0;
    let observer: ResizeObserver | undefined;
    const scrollImmediately = (top: number, left: number) => {
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo({ top, left, behavior: 'auto' });
      root.style.scrollBehavior = previous;
    };

    if (hash && !queryOnly) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else {
      scrollImmediately(restoreTarget?.top ?? 0, restoreTarget?.left ?? 0);
    }

    const remember = (position = { top: window.scrollY, left: window.scrollX }) => {
      committedPosition = position;
      positions.current.set(key, position);
      window.sessionStorage.setItem(`scroll:${key}`, JSON.stringify(position));
      window.history.replaceState({ ...(window.history.state ?? {}), __portfolioScroll: position }, '');
    };
    const scheduleRemember = () => {
      window.clearTimeout(saveTimer);
      pendingPosition = { top: window.scrollY, left: window.scrollX };
      saveTimer = window.setTimeout(() => {
        if (pendingPosition) remember(pendingPosition);
        pendingPosition = undefined;
      }, 120);
    };
    const rememberBeforeLinkNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.origin !== window.location.origin) return;
      window.clearTimeout(saveTimer);
      if (pendingPosition && !(pendingPosition.top <= 2 && committedPosition.top > 2)) remember(pendingPosition);
      pendingPosition = undefined;
      window.removeEventListener('scroll', scheduleRemember);
    };
    const listen = () => {
      if (listening) return;
      listening = true;
      remember();
      window.addEventListener('scroll', scheduleRemember, { passive: true });
      document.addEventListener('click', rememberBeforeLinkNavigation, true);
    };
    const restore = () => {
      if (!restoreTarget) { listen(); return; }
      scrollImmediately(restoreTarget.top, restoreTarget.left);
      if (Math.abs(window.scrollY - restoreTarget.top) <= 2) {
        observer?.disconnect();
        listen();
      } else if (attempts < 12) {
        attempts += 1;
        frame = window.requestAnimationFrame(restore);
      } else {
        listen();
      }
    };
    frame = window.requestAnimationFrame(restore);
    if (restoreTarget && Math.abs(window.scrollY - restoreTarget.top) > 2) {
      observer = new ResizeObserver(restore);
      observer.observe(document.body);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(saveTimer);
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleRemember);
      document.removeEventListener('click', rememberBeforeLinkNavigation, true);
    };
  }, [pathname, hash, key, navigationType]);

  return null;
}
