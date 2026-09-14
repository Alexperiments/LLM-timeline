import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const DAY = 86_400_000;
const MIN = Date.UTC(2018, 0, 1);
const dateLabel = (value: number, detailed = false) => new Intl.DateTimeFormat('en', { year: 'numeric', ...(detailed ? { month: 'short' as const } : {}), timeZone: 'UTC' }).format(value);
const tracks = [
  { title: 'Model architecture', color: 'architecture' },
  { title: 'Training methods', color: 'training' },
  { title: 'Agent systems', color: 'agents' },
];

export default function Home() {
  const [max, setMax] = useState(Date.UTC(2026, 8, 14));
  const [range, setRange] = useState([MIN, Date.UTC(2026, 8, 14)]);
  const [width, setWidth] = useState(1000);
  const surface = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [contentEnd, setContentEnd] = useState(760);
  const scroller = useRef<HTMLDivElement>(null);
  const selectionDrag = useRef<{ x: number; range: number[] } | null>(null);
  useEffect(() => {
    const today = new Date();
    const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    setMax(end);
    setRange([MIN, end]);
    const measure = () => {
      if (!surface.current || !labels.current) return;
      const box = surface.current.getBoundingClientRect();
      const leftEdges = Array.from(labels.current.querySelectorAll('h2'), label => label.getBoundingClientRect().left);
      setWidth(box.width);
      setContentEnd(Math.max(0, Math.min(...leftEdges) - box.left - 24));
    };
    const observer = new ResizeObserver(measure);
    if (surface.current) observer.observe(surface.current);
    labels.current?.querySelectorAll('h2').forEach(label => observer.observe(label));
    measure();
    return () => observer.disconnect();
  }, []);
  const [cursor, setCursor] = useState<number | null>(null);
  const drag = useRef<{ x: number; range: number[] } | null>(null);
  const span = range[1] - range[0];
  function pan(amount: number, initial = range) {
    const width = initial[1] - initial[0];
    const start = Math.max(MIN, Math.min(max - width, initial[0] + amount));
    setRange([start, start + width]);
  }
  const months = span / (DAY * 30.44);
  const labelCapacity = Math.max(2, Math.floor(contentEnd / 105));
  const step = [1, 2, 3, 6, 12, 24, 60].find(value => months / value <= labelCapacity) ?? 60;
  const ticks: number[] = [];
  const start = new Date(range[0]);
  let month = start.getUTCFullYear() * 12 + start.getUTCMonth();
  month = Math.ceil(month / step) * step;
  for (;;) {
    const value = Date.UTC(Math.floor(month / 12), month % 12, 1);
    if (value > range[1]) break;
    if (value >= range[0]) ticks.push(value);
    month += step;
  }
  const detailed = step < 12;
  return (
    <main className="observatory">
      <header className="masthead">
        <h1>LLM Atlas<span className="title-dot">.</span></h1>
        <div className="search-wrap"><Search size={17} aria-hidden="true"/><input aria-label="Search ideas" placeholder="Search ideas" disabled title="Search will be available when ideas are added"/></div>
      </header>

      <section className="timeline-shell" aria-label="Timeline explorer">
        <div className="date-heading" style={{ marginRight: Math.max(0, width - contentEnd) }}><div><span className="eyebrow">FROM</span><p>{dateLabel(range[0], detailed)}</p></div><div className="date-end"><span className="eyebrow">TO</span><p>{dateLabel(range[1], detailed)}</p></div></div>
        <div ref={surface} className="timeline" tabIndex={0} role="region" aria-label="Empty timeline. Drag or use left and right arrow keys to navigate."
          onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); pan(event.key === 'ArrowLeft' ? -span / 10 : span / 10); } }}
          onWheel={event => { if (event.clientX - event.currentTarget.getBoundingClientRect().left <= contentEnd) pan((event.deltaX || event.deltaY) * span / Math.max(1, contentEnd)); }}
          onPointerDown={event => { if(event.button !== 0 || event.clientX - event.currentTarget.getBoundingClientRect().left > contentEnd) return; drag.current = { x: event.clientX, range: [...range] }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); const x = event.clientX - box.left; setCursor(x >= 0 && x <= contentEnd ? x / Math.max(1, contentEnd) : null); if(drag.current) pan((drag.current.x-event.clientX)/Math.max(1, contentEnd)*(drag.current.range[1]-drag.current.range[0]), drag.current.range); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { if(!drag.current) setCursor(null); }}>
          <div className="year-grid" style={{ width: contentEnd }} aria-hidden="true">{ticks.map(value => <div key={value} className="year-tick" style={{ left: `${(value-range[0])/span*100}%` }}><span style={{ transform: (value-range[0])/span < .06 ? 'none' : (value-range[0])/span > .94 ? 'translateX(-100%)' : undefined }}>{dateLabel(value, detailed)}</span></div>)}</div>
          <svg className="ribbons" viewBox="0 0 1440 510" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="lane-content-clip"><rect width={contentEnd / width * 1440} height="510"/></clipPath>
              <linearGradient id="blue"><stop stopColor="#7966c6"/><stop offset="1" stopColor="#47a6c4"/></linearGradient>
              <linearGradient id="teal"><stop stopColor="#299ba9"/><stop offset="1" stopColor="#8eba5e"/></linearGradient>
              <linearGradient id="gold"><stop stopColor="#d9805e"/><stop offset="1" stopColor="#dcba4f"/></linearGradient>
              <path id="architecture-ribbon" d="M0 173 C108 173 141 15 300 15 H1440 V165 H300 C145 165 110 333 0 333Z"/>
              <path id="training-ribbon" d="M0 173 C110 173 170 180 300 180 H1440 V330 H300 C170 330 110 333 0 333Z"/>
              <path id="agents-ribbon" d="M0 173 C115 173 150 345 300 345 H1440 V495 H300 C140 495 110 333 0 333Z"/>
              <clipPath id="architecture-clip"><use href="#architecture-ribbon"/></clipPath>
              <clipPath id="training-clip"><use href="#training-ribbon"/></clipPath>
              <clipPath id="agents-clip"><use href="#agents-ribbon"/></clipPath>
            </defs>
            <use href="#architecture-ribbon" fill="url(#blue)"/>
            <use href="#training-ribbon" fill="url(#teal)"/>
            <use href="#agents-ribbon" fill="url(#gold)"/>
            {/* Explicit intersections give each ribbon equal weight, independent of paint order.
                Luminous mixed colors avoid the darkening of multiply compositing. */}
            <g clipPath="url(#architecture-clip)">
              <use href="#training-ribbon" fill="#648cb9"/>
              <use href="#agents-ribbon" fill="#b180af"/>
              <g clipPath="url(#training-clip)"><use href="#agents-ribbon" fill="#9794b0"/></g>
            </g>
            <g clipPath="url(#training-clip)">
              <use href="#agents-ribbon" fill="#94a28a"/>
              <g clipPath="url(#architecture-clip)"><use href="#agents-ribbon" fill="#9794b0"/></g>
            </g>
            <g clipPath="url(#lane-content-clip)" fill="none" stroke="white" strokeOpacity=".55"><path d="M0 253 C120 253 142 90 300 90 H1440"/><path d="M0 253 H1440"/><path d="M0 253 C120 253 142 420 300 420 H1440"/></g>
          </svg>
          {/* Future idea nodes and practice spans belong in this shared, clipped viewport.
              Keep full badge bounds inside it; its fade softens entries/exits while panning. */}
          <div className="ideas-viewport" style={{ width: contentEnd }} />
          <div ref={labels} className="track-labels">{tracks.map(track => <div className={`track-label ${track.color}`} key={track.color}><h2>{track.title.split(' ')[0]}<br/>{track.title.split(' ').slice(1).join(' ')}</h2></div>)}</div>
          {cursor !== null && <div className="cursor-guide" style={{left: cursor * contentEnd}}><span style={{ transform: cursor > .9 ? 'translateX(-100%)' : cursor < .1 ? 'none' : undefined }}>{dateLabel(range[0]+cursor*span, true)}</span></div>}
        </div>
      </section>

      <div className="navigator" ref={scroller}>
        <Slider className="time-slider" aria-label="Visible date range" min={MIN} max={max} step={DAY} minStepsBetweenValues={14} value={range} onValueChange={value => setRange(Array.isArray(value) ? value : [value, range[1]])}/>
        <div className="range-pan" role="slider" tabIndex={0} aria-label="Move visible date range" aria-valuemin={MIN} aria-valuemax={max-span} aria-valuenow={range[0]} aria-valuetext={`${dateLabel(range[0], true)} to ${dateLabel(range[1], true)}`} style={{left: `calc(${(range[0]-MIN)/(max-MIN)*100}% + 24px)`, width: `max(0px, calc(${span/(max-MIN)*100}% - 48px))`}}
          onKeyDown={event => { if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); pan(event.key === 'ArrowLeft' ? -span/10 : span/10); } }}
          onPointerDown={event => { if(event.button !== 0) return; event.preventDefault(); selectionDrag.current = { x: event.clientX, range: [...range] }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={event => { if(selectionDrag.current && scroller.current) pan((event.clientX-selectionDrag.current.x)/scroller.current.clientWidth*(max-MIN), selectionDrag.current.range); }}
          onPointerUp={() => { selectionDrag.current = null; }} onPointerCancel={() => { selectionDrag.current = null; }}/>
      </div>
    </main>
  );
}
