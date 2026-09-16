import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { laneY } from './idea-content';

// Animate grouping in date space, then project through the current viewport on
// every render. Zoom, pan, and resize never wait for a pixel-position transition.
export function IdeaMarker({ date, range, contentWidth, surfaceWidth, lane, style, ...props }: ComponentPropsWithoutRef<'button'> & {
  date: number;
  range: number[];
  contentWidth: number;
  surfaceWidth: number;
  lane: number;
}) {
  const [displayDate, setDisplayDate] = useState(date);
  const currentDate = useRef(date);

  useLayoutEffect(() => {
    const from = currentDate.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = media.matches ? 1 : Math.min(1, (now - start) / 400);
      const eased = progress * progress * (3 - 2 * progress);
      currentDate.current = from + (date - from) * eased;
      setDisplayDate(currentDate.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    if (from !== date) frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [date]);

  const anchor = (displayDate - range[0]) / (range[1] - range[0]) * contentWidth;
  return <button {...props} style={{ ...style, left: anchor - 22, top: `${laneY(lane, anchor, surfaceWidth)}%` }}/>;
}
