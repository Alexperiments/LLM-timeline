import { useEffect, useRef, useState } from 'react';
import { centerlinePaths } from './idea-content';

type Pulse = { id: number; lane: number; duration: number; expires: number };

// Newly inserted SMIL animations must start now, not at the SVG's time origin.
const startAnimation = (animation: SVGAnimationElement | null) => animation?.beginElement();

export function LanePulses({ endX }: { endX: number }) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const duration = 5500 + Math.random() * 2500;
        const now = performance.now();
        const pulse = { id: nextId.current++, lane: Math.floor(Math.random() * centerlinePaths.length), duration, expires: now + duration };
        setPulses(current => [...current.filter(item => item.expires > now), pulse]);
        schedule();
      }, 450 + Math.random() * 1350);
    };
    const restart = () => {
      clearTimeout(timer);
      setPulses([]);
      if (!reducedMotion.matches && !document.hidden) schedule();
    };
    restart();
    reducedMotion.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    return () => {
      clearTimeout(timer);
      reducedMotion.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', restart);
    };
  }, []);

  return <g className="lane-pulses" fill="white" pointerEvents="none">
    {pulses.map(pulse => <g key={pulse.id}>
      <animateMotion ref={startAnimation} path={centerlinePaths[pulse.lane].replace(/H\d+$/, `H${Math.max(300, endX)}`)} dur={`${pulse.duration}ms`} begin="indefinite" fill="freeze"/>
      <g opacity="0">
        <animate ref={startAnimation} attributeName="opacity" values="0;0.9;0.55;0.9;0.55;0.9;0" keyTimes="0;0.08;0.25;0.42;0.59;0.78;1" dur={`${pulse.duration}ms`} begin="indefinite" fill="freeze"/>
        <circle r="5" opacity="0.16"/>
        <circle r="2"/>
      </g>
    </g>)}
  </g>;
}
