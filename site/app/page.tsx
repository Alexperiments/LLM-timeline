import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import ideas, { type Idea } from 'virtual:ideas';
import { layoutIdeas, formatIdeaDate, laneY, ribbonPaths, centerlinePaths, type LayoutNode } from './idea-content';
import { LanePulses } from './lane-pulses';
import { SplitLesson } from './split-lesson';
import { clampThumb, sliderFractions } from './slider-geometry';

const DAY = 86_400_000;
const MAX_ZOOM_DAYS = 30;
const MAX_ZOOM_SPAN = MAX_ZOOM_DAYS * DAY;
const MIN = Date.UTC(2015, 0, 1);
const TODAY = new Date().setUTCHours(0, 0, 0, 0);
const MAX = Math.max(TODAY, ...ideas.map(idea => idea.end?.value ?? idea.start.value));
const dateLabel = (value: number, detailed = false) => new Intl.DateTimeFormat('en', { year: 'numeric', ...(detailed ? { month: 'short' as const } : {}), timeZone: 'UTC' }).format(value);
const tracks = [
  { title: 'Model architecture', color: 'architecture' },
  { title: 'Training methods', color: 'training' },
  { title: 'Agent systems', color: 'agents' },
];

export default function Home() {
  const [max, setMax] = useState(MAX);
  const [range, setRange] = useState([MIN, MAX]);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(location.search).get('idea'));
  const selected = ideas.find(idea => idea.id === selectedId);
  const [splitBusy, setSplitBusy] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const lastNode = useRef<string | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const closeCluster = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setSelectedId(new URLSearchParams(location.search).get('idea'));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => { setOpenCluster(null); }, [range]);
  useEffect(() => {
    if (!openCluster) return;
    const onDown = (event: PointerEvent) => { if (closeCluster.current && !closeCluster.current.contains(event.target as Node)) setOpenCluster(null); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenCluster(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openCluster]);
  function openIdea(idea: Idea) {
    if (!selected) lastNode.current = idea.id;
    const url = new URL(location.href); url.searchParams.set('idea', idea.id);
    history.pushState({}, '', url); setSelectedId(idea.id); setQuery('');
  }
  function closeLesson() {
    const url = new URL(location.href); url.searchParams.delete('idea');
    history.pushState({}, '', url); setSelectedId(null);

  }
  useEffect(() => {
    if (!splitBusy && lastNode.current) document.getElementById(`idea-${lastNode.current}`)?.focus({ preventScroll: true });
  }, [splitBusy]);
  const [width, setWidth] = useState(1000);
  const surface = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [contentEnd, setContentEnd] = useState(760);
  const scroller = useRef<HTMLDivElement>(null);
  const selectionDrag = useRef<{ x: number; range: number[] } | null>(null);
  const [navigatorWidth, setNavigatorWidth] = useState(1000);
  useEffect(() => {
    const today = new Date();
    const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    setMax(Math.max(end, MAX));
    setRange([MIN, Math.max(end, MAX)]);
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
  const sliderWidth = Math.max(1, navigatorWidth);
  const expandedThumbSize = 44;
  // Remove the minimum date span before mapping onto the space between thumbs.
  const [startFraction, endFraction] = sliderFractions(range, MIN, max, MAX_ZOOM_SPAN);
  const sliderVisualStyle = {
    '--thumb-expanded-size': `${expandedThumbSize}px`,
    '--slider-start': startFraction,
    '--slider-end': endFraction,
  } as CSSProperties;
  const thumbDrag = useRef<{ index: number; x: number; value: number; travel: number } | null>(null);
  const [navigatorDragging, setNavigatorDragging] = useState(false);
  function stopZoomAnimation() {
    if (zoomAnim.current !== null) cancelAnimationFrame(zoomAnim.current);
    zoomAnim.current = null;
  }
  function moveThumb(index: number, value: number) {
    stopZoomAnimation();
    setRange(current => clampThumb(current, index, value, MIN, max, MAX_ZOOM_SPAN));
  }
  useEffect(() => {
    const measure = () => {
      if (!scroller.current) return;
      const nextWidth = scroller.current.clientWidth;
      setNavigatorWidth(nextWidth);
    };
    const observer = new ResizeObserver(measure);
    if (scroller.current) observer.observe(scroller.current);
    measure();
    return () => observer.disconnect();
  }, []);
  function pan(amount: number, initial = range) {
    const width = initial[1] - initial[0];
    const start = Math.max(MIN, Math.min(max - width, initial[0] + amount));
    setRange([start, start + width]);
  }
  const zoomAnim = useRef<number | null>(null);
  useEffect(() => () => { if (zoomAnim.current !== null) cancelAnimationFrame(zoomAnim.current); }, []);
  function zoomRange(target: [number, number]) {
    if (zoomAnim.current !== null) cancelAnimationFrame(zoomAnim.current);
    const from = range;
    const targetSpan = Math.min(max - MIN, Math.max(MAX_ZOOM_SPAN, target[1] - target[0]));
    const targetStart = Math.max(MIN, Math.min(max - targetSpan, (target[0] + target[1] - targetSpan) / 2));
    const to: [number, number] = [targetStart, targetStart + targetSpan];
    const duration = 450;
    const t0 = performance.now();
    const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = ease(t);
      setRange([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
      if (t < 1) zoomAnim.current = requestAnimationFrame(step);
      else zoomAnim.current = null;
    };
    zoomAnim.current = requestAnimationFrame(step);
  }
  function handleCluster(node: LayoutNode) {
    if (node.kind !== 'cluster') return;
    if (node.expandable) {
      const values = node.items.map(item => item.start.value);
      const d = Math.max(DAY, Math.max(...values) - Math.min(...values));
      const center = (Math.min(...values) + Math.max(...values)) / 2;
      const span = d / 0.3;
      const start = Math.max(MIN, center - span / 2);
      zoomRange([start, start + span]);
      setOpenCluster(null);
    } else {
      const key = node.items.map(item => item.id).sort().join('|');
      setOpenCluster(current => current === key ? null : key);
    }
  }
  function resetTimeline() {
    if (selected) closeLesson();
    setQuery('');
    setOpenCluster(null);
    setCursor(null);
    zoomRange([MIN, max]);
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
  const yearLabels: { value: number; label: string }[] = [];
  {
    const yearSpan = Math.max(1, Math.round((MAX - MIN) / DAY / 365.25));
    const interval = Math.max(1, Math.ceil(yearSpan / 7));
    for (let y = new Date(MIN).getUTCFullYear(); y <= new Date(MAX).getUTCFullYear(); y += interval) {
      const value = Date.UTC(y, 0, 1);
      if (value >= MIN && value <= MAX) yearLabels.push({ value, label: dateLabel(value) });
    }
  }
  const layout = layoutIdeas(range, contentEnd, max);
  const laneHeight = 150;
  const splitDate = selected ? selected.category === 'Practice' ? (selected.start.value + (selected.end?.value ?? max)) / 2 : selected.start.value : 0;
  const splitOrigin = Math.max(0, Math.min(contentEnd, (splitDate - range[0]) / span * contentEnd));
  const results = query.trim() ? ideas.filter(idea => `${idea.title} ${idea.body} ${idea.track}`.toLowerCase().includes(query.toLowerCase().trim())) : [];
  return (
    <main className={`observatory ${selected ? 'lesson-open' : ''}`}>
      <header className="masthead">
        <h1><button type="button" className="timeline-home" onClick={resetTimeline} title="Show the full timeline">LLM Timeline<span className="title-dot">.</span></button></h1>
        <div className="search-wrap"><Search size={17} aria-hidden="true"/><input aria-label="Search ideas" placeholder="Search ideas" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if(event.key === 'Escape') setQuery(''); }}/>
          {query.trim() && <div className="search-results">{results.length ? results.map(idea => <button key={idea.id} onClick={() => openIdea(idea)}>{idea.title}<small>{idea.track} · {formatIdeaDate(idea.start)}</small></button>) : <p>No matching ideas.</p>}</div>}
        </div>
      </header>

      <section className="timeline-shell" aria-label="Timeline explorer">
        <div ref={scene} className="timeline-scene" inert={!!selected || splitBusy}>
        <div ref={surface} className="timeline" style={{ height: laneHeight * 3, minHeight: laneHeight * 3 }} tabIndex={0} role="region" aria-label="Timeline. Double-click to zoom in. Drag or use left and right arrow keys to navigate."
          onDoubleClick={event => {
            if ((event.target as Element).closest('button')) return;
            const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
            if (contentEnd <= 0 || x < 0 || x > contentEnd) return;
            const fraction = x / contentEnd;
            const date = range[0] + fraction * span;
            const nextSpan = Math.max(MAX_ZOOM_SPAN, span / 1.5);
            // Keep the clicked date under the pointer as the surrounding range contracts.
            const start = date - fraction * nextSpan;
            zoomRange([start, start + nextSpan]);
          }}
          onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stopZoomAnimation(); pan(event.key === 'ArrowLeft' ? -span / 10 : span / 10); } }}
          onWheel={event => { if (event.clientX - event.currentTarget.getBoundingClientRect().left <= contentEnd) pan((event.deltaX || event.deltaY) * span / Math.max(1, contentEnd)); }}
          onPointerDown={event => { if((event.target as HTMLElement).closest('button') || event.button !== 0 || event.clientX - event.currentTarget.getBoundingClientRect().left > contentEnd) return; drag.current = { x: event.clientX, range: [...range] }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={event => { const box = event.currentTarget.getBoundingClientRect(); const x = event.clientX - box.left; setCursor(x >= 0 && x <= contentEnd ? x / Math.max(1, contentEnd) : null); if(drag.current) pan((drag.current.x-event.clientX)/Math.max(1, contentEnd)*(drag.current.range[1]-drag.current.range[0]), drag.current.range); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { if(!drag.current) setCursor(null); }}>
          <div className="year-grid" style={{ width: contentEnd }} aria-hidden="true">{ticks.map(value => <div key={value} className="year-tick" style={{ left: `${(value-range[0])/span*100}%` }}><span style={{ transform: (value-range[0])/span < .06 ? 'none' : (value-range[0])/span > .94 ? 'translateX(-100%)' : undefined }}>{dateLabel(value, detailed)}</span></div>)}</div>
          <svg className="ribbons" viewBox="0 0 1440 510" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="lane-content-clip"><rect width={contentEnd / width * 1440} height="510"/></clipPath>
              <linearGradient id="blue"><stop stopColor="#7966c6"/><stop offset="1" stopColor="#47a6c4"/></linearGradient>
              <linearGradient id="teal"><stop stopColor="#299ba9"/><stop offset="1" stopColor="#8eba5e"/></linearGradient>
              <linearGradient id="gold"><stop stopColor="#d9805e"/><stop offset="1" stopColor="#dcba4f"/></linearGradient>
              <path id="architecture-ribbon" d={ribbonPaths[0]}/>
              <path id="training-ribbon" d={ribbonPaths[1]}/>
              <path id="agents-ribbon" d={ribbonPaths[2]}/>
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
            <g clipPath="url(#lane-content-clip)">
              <g fill="none" stroke="white" strokeOpacity=".55">{centerlinePaths.map(path => <path key={path} d={path}/>)}</g>
              <LanePulses endX={contentEnd / width * 1440}/>
            </g>
          </svg>
          <div className="ideas-viewport" style={{ width: contentEnd }}>
            {layout.map((lane, laneIndex) => <div className="idea-lane" key={tracks[laneIndex].title} style={{ top: 0, height: '100%' }}>
              {lane.items.map(node => {
                const anchor = node.anchor;
                const fade = Math.max(0, Math.min(1, anchor / Math.max(60, width * .12), (contentEnd-anchor) / 24));
                const top = laneY(laneIndex, anchor, width);
                const markerCenter = node.kind === 'practice' ? node.width / 2 : 22;
                const tooltipStyle = {
                  left: anchor < 110 ? 0 : anchor > contentEnd - 110 ? 'auto' : undefined,
                  right: anchor > contentEnd - 110 ? 0 : undefined,
                  '--idea-translate-x': anchor < 110 || anchor > contentEnd - 110 ? '0%' : undefined,
                  '--idea-origin': anchor < 110 ? `${markerCenter}px` : anchor > contentEnd - 110 ? `calc(100% - ${markerCenter}px)` : '50%',
                } as CSSProperties;
                if (node.kind === 'point') {
                  return <button id={`idea-${node.idea.id}`} key={node.idea.id} aria-label={`${node.idea.title} · ${formatIdeaDate(node.idea.start)}`} className={`idea-node point-node ${node.idea.category === 'Capability landmark' ? 'landmark-node' : ''}`} style={{ left: node.left, opacity: fade, top: `${top}%` }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={() => openIdea(node.idea)}><span className="idea-dot" aria-hidden="true"/><span className="idea-tooltip" style={tooltipStyle}><span className="idea-label">{node.idea.title}</span></span></button>;
                }
                if (node.kind === 'cluster') {
                  const open = openCluster === node.items.map(item => item.id).sort().join('|');
                  return <span className="cluster-wrap" key={node.idea.id} style={{ left: node.left, top: `${top}%`, opacity: fade }}>
                    <button className="idea-node point-node cluster-node" data-idea-ids={JSON.stringify(node.items.map(item => item.id))} aria-label={`${node.items.length} ideas, ${node.expandable ? 'zoom in' : 'show list'}`} aria-expanded={open} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={() => handleCluster(node)}><span className="idea-dot" aria-hidden="true"/><span className="cluster-count">{node.items.length}</span></button>
                    {open && <div className="cluster-dropdown" ref={closeCluster} onPointerDown={event => event.stopPropagation()}>
                      <button className="cluster-close" aria-label="Close" onClick={() => setOpenCluster(null)}>×</button>
                      <ul>{node.items.map(item => <li key={item.id}><button onClick={() => openIdea(item)}><span className="cluster-item-title">{item.title}</span><small>{item.category}</small></button></li>)}</ul>
                    </div>}
                  </span>;
                }
                return <button id={`idea-${node.idea.id}`} key={node.idea.id} aria-label={`${node.idea.title} · ${formatIdeaDate(node.idea.start)}`} className={`idea-node practice-node`} style={{ left: node.left, width: node.width, top: `${top}%` }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={() => openIdea(node.idea)}><span className="idea-dot" aria-hidden="true"/><span className="idea-tooltip" style={tooltipStyle}><span className="idea-label">{node.idea.title}</span></span></button>;
              })}
            </div>)}
          </div>
          <div ref={labels} className="track-labels">{tracks.map(track => <div className={`track-label ${track.color}`} key={track.color}><h2>{track.title.split(' ')[0]}<br/>{track.title.split(' ').slice(1).join(' ')}</h2></div>)}</div>
          {cursor !== null && <div className="cursor-guide" style={{left: cursor * contentEnd}}><span style={{ transform: cursor > .9 ? 'translateX(-100%)' : cursor < .1 ? 'none' : undefined }}>{dateLabel(range[0]+cursor*span, true)}</span></div>}
        </div>
        </div>
        <SplitLesson idea={selected} scene={scene} origin={splitOrigin} onClose={closeLesson} onSelect={openIdea} onBusy={setSplitBusy}/>
      </section>

      <div className={`navigator${navigatorDragging ? ' is-dragging' : ''}`} ref={scroller} inert={!!selected || splitBusy} style={sliderVisualStyle} onDoubleClick={resetTimeline}>
        <div className="time-slider"
          onPointerDown={event => {
            if (event.button !== 0 || thumbDrag.current) return;
            const thumbs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.slider-thumb'));
            const centers = thumbs.map(thumb => { const box = thumb.getBoundingClientRect(); return box.left + box.width / 2; });
            const pressed = thumbs.findIndex(thumb => thumb.contains(event.target as Node));
            const index = pressed >= 0 ? pressed : Math.abs(event.clientX - centers[0]) < Math.abs(event.clientX - centers[1]) ? 0 : 1;
            const diameter = thumbs[index].getBoundingClientRect().width;
            const box = event.currentTarget.getBoundingClientRect();
            const fraction = (event.clientX - box.left - diameter * (index + .5)) / Math.max(1, box.width - diameter * 2);
            const clickedValue = MIN + index * MAX_ZOOM_SPAN + Math.round(fraction * (max - MIN - MAX_ZOOM_SPAN) / DAY) * DAY;
            const value = pressed >= 0 ? range[index] : clampThumb(range, index, clickedValue, MIN, max, MAX_ZOOM_SPAN)[index];
            event.preventDefault();
            thumbs[index].focus({ preventScroll: true });
            moveThumb(index, value);
            // Keep drag sensitivity fixed while hover geometry animates.
            thumbDrag.current = { index, x: event.clientX, value, travel: Math.max(1, sliderWidth - expandedThumbSize * 2) };
            setNavigatorDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const initial = thumbDrag.current;
            if (!initial) return;
            const delta = (event.clientX - initial.x) / initial.travel * (max - MIN - MAX_ZOOM_SPAN);
            moveThumb(initial.index, initial.value + Math.round(delta / DAY) * DAY);
          }}
          onLostPointerCapture={() => { thumbDrag.current = null; setNavigatorDragging(false); }}
          onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)}
          onPointerCancel={event => event.currentTarget.releasePointerCapture(event.pointerId)}
        >
          <div className="slider-range"/>
          {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Custom geometry needs independent focusable slider thumbs. */}
          {range.map((value, index) => <button key={index} type="button" className="slider-thumb" data-index={index} role="slider" aria-label={index === 0 ? 'Visible range start' : 'Visible range end'} aria-orientation="horizontal"
            aria-valuemin={index === 0 ? MIN : range[0] + MAX_ZOOM_SPAN}
            aria-valuemax={index === 0 ? range[1] - MAX_ZOOM_SPAN : max}
            aria-valuenow={value} aria-valuetext={dateLabel(value, true)}
            onKeyDown={event => {
              const amounts: Record<string, number> = { ArrowLeft: -DAY, ArrowDown: -DAY, ArrowRight: DAY, ArrowUp: DAY, PageDown: -MAX_ZOOM_SPAN, PageUp: MAX_ZOOM_SPAN };
              if (event.key in amounts || event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                moveThumb(index, event.key === 'Home' ? MIN : event.key === 'End' ? max : value + amounts[event.key]);
              }
            }}

          />)}
        </div>
        <div className="year-labels" aria-hidden="true">{yearLabels.map(({ value, label }) => { const frac = (value - MIN) / (MAX - MIN); const transform = frac < .06 ? 'none' : frac > .94 ? 'translateX(-100%)' : 'translateX(-50%)'; return <span key={value} style={{ left: `${frac * 100}%`, transform }}>{label}</span>; })}</div>
        <div className="range-pan" role="slider" tabIndex={0} aria-label="Move visible date range" aria-valuemin={MIN} aria-valuemax={max-span} aria-valuenow={range[0]} aria-valuetext={`${dateLabel(range[0], true)} to ${dateLabel(range[1], true)}`}
          onKeyDown={event => { if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stopZoomAnimation(); pan(event.key === 'ArrowLeft' ? -span/10 : span/10); } }}
          onPointerDown={event => { if(event.button !== 0) return; event.preventDefault(); stopZoomAnimation(); setNavigatorDragging(true); selectionDrag.current = { x: event.clientX, range: [...range] }; event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={event => { if(selectionDrag.current && scroller.current) pan((event.clientX-selectionDrag.current.x)/Math.max(1, scroller.current.clientWidth - expandedThumbSize * 2)*(max-MIN-MAX_ZOOM_SPAN), selectionDrag.current.range); }}
          onLostPointerCapture={() => { selectionDrag.current = null; setNavigatorDragging(false); }}/>
      </div>
    </main>
  );
}
