import { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; radius: number; color: string };

export function BackgroundParticles() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: -1000, y: -1000 };
    const particles: Particle[] = [];
    const palette = ['#3d69c6', '#26a6c9', '#f0d447', '#f08b35', '#d83c43', '#8c3fa8'];
    const createParticle = (): Particle => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, radius: Math.random() * 1.7 + 1.1, color: palette[Math.floor(Math.random() * palette.length)] });
    const resize = () => {
      const previousWidth = width;
      const previousHeight = height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      element.width = width * ratio;
      element.height = height * ratio;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Keep the same field when the viewport changes; only remap its coordinates.
      if (previousWidth && previousHeight) for (const particle of particles) { particle.x = particle.x / previousWidth * width; particle.y = particle.y / previousHeight * height; }
      const count = Math.min(120, Math.max(28, Math.round((width * height) / 22000)));
      while (particles.length < count) particles.push(createParticle());
      if (particles.length > count) particles.length = count;
    };
    const move = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
    const leave = () => { pointer.x = -1000; pointer.y = -1000; };
    const render = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 120 && distance > 0) { const force = (120 - distance) / 120 * .7; particle.x += dx / distance * force; particle.y += dy / distance * force; }
        particle.x += particle.vx; particle.y += particle.vy;
        if (particle.x < -20 || particle.x > width + 20) particle.vx *= -1;
        if (particle.y < -20 || particle.y > height + 20) particle.vy *= -1;
        context.beginPath(); context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); context.globalAlpha = .34; context.fillStyle = particle.color; context.fill(); context.globalAlpha = 1;
      }
      for (let a = 0; a < particles.length; a += 1) for (let b = a + 1; b < particles.length; b += 1) {
        const first = particles[a]; const second = particles[b]; const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (distance < 155) { context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.globalAlpha = .2 * (1 - distance / 155); context.strokeStyle = first.color; context.stroke(); context.globalAlpha = 1; }
      }
      frame = requestAnimationFrame(render);
    };
    resize(); render();
    window.addEventListener('resize', resize); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave); };
  }, []);

  return <canvas ref={canvas} className="background-particles" aria-hidden="true" />;
}
