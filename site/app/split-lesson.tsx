import { useEffect, useLayoutEffect, useRef, useState, type RefObject, type CSSProperties } from 'react';
import type { Idea } from 'virtual:ideas';
import { Lesson } from './idea-content';

// Both panes are inert copies of the exact current scene, including dates and markers.
// Only their translations change; the live timeline retains its range and layout.
export function SplitLesson({ idea, scene, origin, onClose, onSelect, onBusy }: {
  idea: Idea | undefined; scene: RefObject<HTMLDivElement | null>; origin: number;
  onClose: () => void; onSelect: (idea: Idea) => void; onBusy: (busy: boolean) => void;
}) {
  const [retained, setRetained] = useState(idea);
  const [expanded, setExpanded] = useState(false);
  const [geometry, setGeometry] = useState({ width: 1, height: 1, split: 0, edge: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const splitRatio = useRef<number | null>(null);

  useEffect(() => {
    if (idea) { setRetained(idea); onBusy(true); let active = true; requestAnimationFrame(() => requestAnimationFrame(() => { if (active) setExpanded(true); })); return () => { active = false; }; }
    setExpanded(false);
    const timer = window.setTimeout(() => { setRetained(undefined); splitRatio.current = null; onBusy(false); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 560);
    return () => clearTimeout(timer);
  }, [idea, onBusy]);

  useLayoutEffect(() => {
    if (!retained || !scene.current || !left.current || !right.current) return;
    const source = scene.current;
    if (splitRatio.current === null) {
      const marker = Array.from(source.querySelectorAll<HTMLElement>('.idea-node'))
        .find(node => {
          if (node.id === `idea-${retained.id}`) return true;
          if (!node.dataset.ideaIds) return false;
          try { return (JSON.parse(node.dataset.ideaIds) as string[]).includes(retained.id); }
          catch { return false; }
        })
        ?.querySelector<HTMLElement>('.idea-dot');
      const sourceBox = source.getBoundingClientRect();
      const markerBox = marker?.getBoundingClientRect();
      const measuredOrigin = markerBox
        ? markerBox.left + markerBox.width / 2 - sourceBox.left
        : origin;
      splitRatio.current = Math.max(0, Math.min(1, measuredOrigin / Math.max(1, source.clientWidth)));
    }
    const update = () => {
      const width = source.clientWidth;
      setGeometry({ width, height: source.clientHeight, split: width * splitRatio.current!, edge: Math.min(80, width * .075) });
      for (const [target, prefix] of [[left.current, 'split-left-'], [right.current, 'split-right-']] as const) {
        if (!target) continue;
        const clone = source.cloneNode(true) as HTMLElement;
        clone.removeAttribute('style');
        clone.style.width = `${width}px`;
        clone.style.height = `${source.clientHeight}px`;
        clone.style.visibility = 'visible';
        clone.inert = true;
        clone.setAttribute('aria-hidden', 'true');
        const ids = new Map<string, string>();
        clone.querySelectorAll('[id]').forEach(node => { const id = node.id; ids.set(id, prefix + id); node.id = prefix + id; });
        clone.querySelectorAll('*').forEach(node => {
          for (const attr of Array.from(node.attributes)) {
            let value = attr.value;
            for (const [id, replacement] of ids) { value = value.replaceAll(`url(#${id})`, `url(#${replacement})`); if(value === `#${id}`) value = `#${replacement}`; }
            if (value !== attr.value) node.setAttribute(attr.name, value);
          }
        });
        target.replaceChildren(clone);
        clone.scrollTop = source.scrollTop;
      }
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(source);
    return () => { observer.disconnect(); };
  // Preserve the original split point and scene when navigating between lessons.
  }, [!!retained, scene]);

  if (!retained) return null;
  const { width, height, split, edge } = geometry;
  const style = { '--split-x': `${split}px`, '--split-right': `${width-split}px`, '--edge': `${edge}px`, height } as CSSProperties;
  return <div ref={stage} className={`split-stage ${expanded ? 'is-expanded' : ''}`} style={style}>
    <div className="split-half split-left" style={{ width: split, transform: `translateX(${expanded ? edge-split : 0}px)` }} aria-hidden="true"><div ref={left}/></div>
    <div className="split-half split-right" style={{ left: split, width: width-split, transform: `translateX(${expanded ? width-edge-split : 0}px)` }} aria-hidden="true"><div ref={right} style={{ marginLeft: -split }}/></div>
    <Lesson container={stage} idea={retained} onClose={onClose} onSelect={onSelect}/>
  </div>;
}
