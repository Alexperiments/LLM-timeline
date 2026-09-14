import { useEffect, useRef, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ideas, { type Idea, type IdeaDate } from 'virtual:ideas';

export function formatIdeaDate(date: IdeaDate) {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', year: 'numeric', ...(date.precision !== 'year' ? { month: 'long' as const } : {}), ...(date.precision === 'day' ? { day: 'numeric' as const } : {}) }).format(date.value);
}

// Follow the same cubic centerlines used by the ribbon SVG, including its curved origin.
export function laneY(lane: number, x: number, surfaceWidth: number) {
  const target = Math.max(0, x / Math.max(1, surfaceWidth) * 1440);
  const end = [90, 253, 420][lane];
  if (target >= 300 || lane === 1) return end / 510 * 100;
  let low = 0, high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2;
    const px = 3 * (1-t)**2 * t * 120 + 3 * (1-t) * t*t * 142 + t**3 * 300;
    if (px < target) low = t; else high = t;
  }
  const t = (low + high) / 2;
  return (253 * ((1-t)**3 + 3*(1-t)**2*t) + end * (3*(1-t)*t*t + t**3)) / 510 * 100;
}

export type LayoutNode =
  | { kind: 'point'; idea: Idea; left: number; anchor: number }
  | { kind: 'practice'; idea: Idea; left: number; width: number; anchor: number }
  | { kind: 'cluster'; idea: Idea; left: number; anchor: number; items: Idea[]; expandable: boolean };

// Punctual idea nodes sit on the lane's middle line. Overlapping ones collapse into a
// single aggregated node showing their count; clicking it zooms in to separate them,
// or reveals a dropdown when they cannot be separated (e.g. all on the same day).
const OVERLAP_PX = 56;

export function layoutIdeas(range: number[], width: number, now: number) {
  const scale = (value: number) => (value - range[0]) / (range[1] - range[0]) * width;
  return ['Model architecture', 'Training methods', 'Agent systems'].map(track => {
    const items: LayoutNode[] = [];
    const punct = ideas
      .filter(idea => idea.track === track && idea.category !== 'Practice' && idea.start.value <= range[1])
      .map(idea => ({ idea, anchor: scale(idea.start.value) }))
      .sort((a, b) => a.anchor - b.anchor);
    const clusters: { idea: Idea; anchor: number }[][] = [];
    for (const point of punct) {
      const last = clusters[clusters.length - 1];
      if (last && point.anchor - last[last.length - 1].anchor <= OVERLAP_PX) last.push(point);
      else clusters.push([point]);
    }
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const point = cluster[0];
        items.push({ kind: 'point', idea: point.idea, left: point.anchor - 22, anchor: point.anchor });
      } else {
        const anchor = cluster.reduce((sum, point) => sum + point.anchor, 0) / cluster.length;
        const expandable = new Set(cluster.map(point => point.idea.start.value)).size > 1;
        items.push({ kind: 'cluster', idea: cluster[0].idea, left: anchor - 22, anchor, items: cluster.map(point => point.idea), expandable });
      }
    }
    ideas.filter(idea => idea.track === track && idea.category === 'Practice').forEach(idea => {
      const end = idea.end?.value ?? Math.max(now, idea.start.value);
      if (end < range[0] || idea.start.value > range[1]) return;
      const anchor = scale((idea.start.value + end) / 2);
      const itemWidth = Math.max(44, Math.min(width, scale(end)) - Math.max(0, scale(idea.start.value)));
      const left = Math.max(0, Math.min(width - itemWidth, scale(idea.start.value)));
      items.push({ kind: 'practice', idea, left, width: itemWidth, anchor });
    });
    return { items, rows: 1 };
  });
}

export function Lesson({ idea, onClose, onSelect, container }: { container: RefObject<HTMLDivElement | null>; idea: Idea | undefined; onClose: () => void; onSelect: (idea: Idea) => void }) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if(body.current) body.current.scrollTop = 0; }, [idea?.id]);
  const siblings = ideas.filter(item => item.track === idea?.track);
  const index = siblings.findIndex(item => item.id === idea?.id);
  return <Dialog.Root open={!!idea} onOpenChange={open => { if(!open) onClose(); }}>

      <Dialog.Portal container={container}>
      <Dialog.Popup className="lesson-dialog-frame" aria-describedby={undefined}>
        {idea && <>
          <div className="lesson-page">
          <header className="lesson-top"><button onClick={onClose} aria-label="Back to timeline"><ArrowLeft size={20}/> Timeline</button><span>{idea.track}</span></header>
          <div className="lesson-scroll" ref={body}>
            <p className="lesson-meta">{idea.category} · {idea.category === 'Practice' ? 'Starting date' : 'Date'}: {formatIdeaDate(idea.start)}{idea.category === 'Practice' && ` — ${idea.end ? formatIdeaDate(idea.end) : 'ongoing'}`}</p>
            <Dialog.Title className="lesson-title">{idea.title}</Dialog.Title>
            <article className="lesson-prose"><ReactMarkdown>{idea.body || 'This lesson has not been written yet.'}</ReactMarkdown></article>
          </div>
          </div>
          <button className="lesson-prev" disabled={index <= 0} onClick={() => onSelect(siblings[index-1])} aria-label="Previous idea on this track"><ArrowLeft/></button>
          <button className="lesson-next" disabled={index >= siblings.length-1} onClick={() => onSelect(siblings[index+1])} aria-label="Next idea on this track"><ArrowRight/></button>
        </>}
      </Dialog.Popup>
      </Dialog.Portal>

  </Dialog.Root>;
}
