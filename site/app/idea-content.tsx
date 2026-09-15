import { useEffect, useRef, type RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Dialog } from '@base-ui/react/dialog';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ideas, { type Idea, type IdeaDate } from 'virtual:ideas';
import { groupOverlappingPoints, IDEA_COLLISION_DISTANCE } from './timeline-layout';

export function formatIdeaDate(date: IdeaDate) {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', year: 'numeric', ...(date.precision !== 'year' ? { month: 'long' as const } : {}), ...(date.precision === 'day' ? { day: 'numeric' as const } : {}) }).format(date.value);
}

const VIEWBOX_WIDTH = 1440;
const VIEWBOX_HEIGHT = 510;
const BEND_END_X = 300;
const LANE_HALF_WIDTH = 75;
const CURVE_SAMPLES = 64;
const LANE_ENDS = [90, 253, 420] as const;

type Point = { x: number; y: number };

function centerlinePoint(end: number, t: number): Point {
  const inverse = 1 - t;
  return {
    x: 3 * inverse ** 2 * t * 120 + 3 * inverse * t ** 2 * 142 + t ** 3 * BEND_END_X,
    y: inverse ** 3 * 253 + 3 * inverse ** 2 * t * 253 + 3 * inverse * t ** 2 * end + t ** 3 * end,
  };
}

function centerlineTangent(end: number, t: number): Point {
  const inverse = 1 - t;
  return {
    x: 3 * (inverse ** 2 * 120 + 2 * inverse * t * (142 - 120) + t ** 2 * (BEND_END_X - 142)),
    y: 6 * inverse * t * (end - 253),
  };
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

// Build each ribbon from parallel offsets of its centerline. Keeping the offsets
// perpendicular to the tangent prevents the lane from narrowing through the bend.
function ribbonPath(end: number) {
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let index = 0; index <= CURVE_SAMPLES; index++) {
    const t = index / CURVE_SAMPLES;
    const point = centerlinePoint(end, t);
    const tangent = centerlineTangent(end, t);
    const length = Math.hypot(tangent.x, tangent.y);
    const normal = { x: -tangent.y / length, y: tangent.x / length };
    upper.push({ x: point.x - normal.x * LANE_HALF_WIDTH, y: point.y - normal.y * LANE_HALF_WIDTH });
    lower.push({ x: point.x + normal.x * LANE_HALF_WIDTH, y: point.y + normal.y * LANE_HALF_WIDTH });
  }
  const pointPath = (point: Point) => `L${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`;
  const upperEnd = upper[upper.length - 1];
  const lowerEnd = lower[lower.length - 1];
  return [
    `M${formatSvgNumber(upper[0].x)} ${formatSvgNumber(upper[0].y)}`,
    ...upper.slice(1).map(pointPath),
    `L${VIEWBOX_WIDTH} ${formatSvgNumber(upperEnd.y)}`,
    `L${VIEWBOX_WIDTH} ${formatSvgNumber(lowerEnd.y)}`,
    ...lower.slice().reverse().map(pointPath),
    'Z',
  ].join(' ');
}

export const ribbonPaths = LANE_ENDS.map(ribbonPath);
export const centerlinePaths = LANE_ENDS.map(end =>
  `M0 253 C120 253 142 ${end} 300 ${end} H${VIEWBOX_WIDTH}`,
);

// Follow the same cubic centerlines used by the ribbon SVG, including its curved origin.
export function laneY(lane: number, x: number, surfaceWidth: number) {
  const target = Math.max(0, x / Math.max(1, surfaceWidth) * VIEWBOX_WIDTH);
  const end = LANE_ENDS[lane] ?? LANE_ENDS[1];
  if (target >= BEND_END_X || lane === 1) return end / VIEWBOX_HEIGHT * 100;
  let low = 0, high = 1;
  for (let i = 0; i < 24; i++) {
    const t = (low + high) / 2;
    if (centerlinePoint(end, t).x < target) low = t; else high = t;
  }
  const t = (low + high) / 2;
  return centerlinePoint(end, t).y / VIEWBOX_HEIGHT * 100;
}

export type LayoutNode =
  | { kind: 'point'; idea: Idea; left: number; anchor: number }
  | { kind: 'practice'; idea: Idea; left: number; width: number; anchor: number }
  | { kind: 'cluster'; idea: Idea; left: number; anchor: number; items: Idea[]; expandable: boolean };

// Punctual idea nodes sit on the lane's middle line. Overlapping ones collapse into a
// single aggregated node showing their count; clicking it zooms in to separate them,
// or reveals a dropdown for smaller groups that are easier to choose from directly.
const MIN_CLUSTER_ZOOM_SIZE = 10;

export function layoutIdeas(range: number[], width: number, now: number) {
  const scale = (value: number) => (value - range[0]) / (range[1] - range[0]) * width;
  return ['Model architecture', 'Training methods', 'Agent systems'].map(track => {
    const items: LayoutNode[] = [];
    const punct = ideas
      .filter(idea => idea.track === track && idea.category !== 'Practice' && idea.start.value >= range[0] && idea.start.value <= range[1])
      .map(idea => ({ idea, anchor: scale(idea.start.value) }))
      .sort((a, b) => a.anchor - b.anchor);
    const clusters = groupOverlappingPoints(punct, IDEA_COLLISION_DISTANCE);
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const point = cluster[0];
        items.push({ kind: 'point', idea: point.idea, left: point.anchor - 22, anchor: point.anchor });
      } else {
        // Keep the aggregate on the first point in its collision window. This
        // preserves the same spacing guarantee used to form the window, so an
        // aggregate cannot overlap the next standalone point after placement.
        const anchor = cluster[0].anchor;
        const hasDistinctDates = new Set(cluster.map(point => point.idea.start.value)).size > 1;
        const expandable = cluster.length >= MIN_CLUSTER_ZOOM_SIZE && hasDistinctDates;
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
            <article className="lesson-prose"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{idea.body || 'This lesson has not been written yet.'}</ReactMarkdown></article>
          </div>
          </div>
          <button className="lesson-prev" disabled={index <= 0} onClick={() => onSelect(siblings[index-1])} aria-label="Previous idea on this track"><ArrowLeft/></button>
          <button className="lesson-next" disabled={index >= siblings.length-1} onClick={() => onSelect(siblings[index+1])} aria-label="Next idea on this track"><ArrowRight/></button>
        </>}
      </Dialog.Popup>
      </Dialog.Portal>

  </Dialog.Root>;
}
