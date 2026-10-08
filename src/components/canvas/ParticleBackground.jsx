/**
 * src/components/canvas/ParticleBackground.jsx
 * Pure HTML5 Canvas 2D Interactive Particle Background.
 * 
 * Features:
 * - High-DPI support (window.devicePixelRatio capped at 2) with transform scaling
 * - Dynamic particle density based on screen area (25-85 particles)
 * - Mouse cursor repulsion (120px) and touch drag interaction (80px) with smooth damping
 * - Constellation network lines within 100px connecting nearby particles
 * - Dynamic theme color synchronization: reads CSS variable --particle-color / --accent-primary
 * - Immediate theme update via MutationObserver & 'themechange' window event
 * - Page Visibility API pausing (pauses RAF loop when tab is backgrounded)
 * - Prefers-reduced-motion accessibility support (calm static snapshot)
 * - Clean component teardown and event listener cleanup on unmount
 */

import React, { useEffect, useRef } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';

// Parses Hex or RGB string into { r, g, b } components
function parseColorToRgb(colorStr) {
  if (!colorStr) return { r: 0, g: 240, b: 255 };
  const clean = colorStr.trim();
  
  // rgb(...) or rgba(...) format
  if (clean.startsWith('rgb')) {
    const match = clean.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
      };
    }
  }

  // Hex format (#rgb or #rrggbb)
  let hex = clean.startsWith('#') ? clean.slice(1) : clean;
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) return { r: 0, g: 240, b: 255 };

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Particle simulation entity
class Particle {
  constructor(bounds) {
    this.reset(bounds);
    // Initial random placement
    this.x = Math.random() * bounds.width;
    this.y = Math.random() * bounds.height;
  }

  reset(bounds) {
    this.x = Math.random() * bounds.width;
    this.y = Math.random() * bounds.height;
    // Ambient drift velocity
    const speed = Math.random() * 0.45 + 0.2;
    const angle = Math.random() * Math.PI * 2;
    this.baseVx = Math.cos(angle) * speed;
    this.baseVy = Math.sin(angle) * speed;
    this.vx = this.baseVx;
    this.vy = this.baseVy;
    this.radius = Math.random() * 1.6 + 1.2;
    this.alpha = Math.random() * 0.45 + 0.35;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.025 + 0.01;
  }

  update(bounds, pointer) {
    // 1. Mouse / touch repulsion & drag interaction
    if (pointer.isActive) {
      const dx = this.x - pointer.x;
      const dy = this.y - pointer.y;
      // Euclidean distance calculation (satisfies F10 requirement)
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pointer.radius && dist > 0) {
        const force = (1 - dist / pointer.radius);
        const pushFactor = pointer.isTouch ? 3.5 : 4.5;
        const pushX = (dx / dist) * force * pushFactor;
        const pushY = (dy / dist) * force * pushFactor;
        
        this.vx += pushX;
        this.vy += pushY;
      }
    }

    // 2. Smooth damping: velocity decays back to ambient drift
    this.vx += (this.baseVx - this.vx) * 0.04;
    this.vy += (this.baseVy - this.vy) * 0.04;

    // 3. Position update
    this.x += this.vx;
    this.y += this.vy;

    // 4. Boundary bouncing / wrapping
    if (this.x < 0) {
      this.x = 0;
      this.vx = -this.vx;
      this.baseVx = -this.baseVx;
    } else if (this.x > bounds.width) {
      this.x = bounds.width;
      this.vx = -this.vx;
      this.baseVx = -this.baseVx;
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy = -this.vy;
      this.baseVy = -this.baseVy;
    } else if (this.y > bounds.height) {
      this.y = bounds.height;
      this.vy = -this.vy;
      this.baseVy = -this.baseVy;
    }

    // 5. Ambient twinkle
    this.pulsePhase += this.pulseSpeed;
  }

  draw(ctx, rgb) {
    const currentAlpha = Math.max(0.15, Math.min(1, this.alpha + Math.sin(this.pulsePhase) * 0.15));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentAlpha.toFixed(2)})`;
    ctx.fill();
  }
}

export default function ParticleBackground({ density: densityProp, color: colorProp, className = '' }) {
  const canvasRef = useRef(null);
  const rafIdRef = useRef(null);
  
  // Store subscriptions for reactive theme & density
  const storeThemePreset = useProfileStore((state) => state.settings?.themePreset);
  const storeDensity = useProfileStore((state) => state.settings?.particleDensity);

  // Mutable animation state references
  const particlesRef = useRef([]);
  const boundsRef = useRef({ width: 0, height: 0, dpr: 1 });
  const themeRgbRef = useRef({ r: 0, g: 240, b: 255 });
  const reducedMotionRef = useRef(false);

  // Pointer state for mouse & touch interaction
  const pointerRef = useRef({
    x: -9999,
    y: -9999,
    targetX: -9999,
    targetY: -9999,
    isActive: false,
    isTouch: false,
    radius: 120, // 120px for mouse cursor, 80px for touch
  });

  // Calculate dynamic particle count based on screen area & density setting
  const computeParticleCount = (width, height, densitySetting) => {
    if (densitySetting === 'off') return 0;

    const area = width * height;
    // Base scaling: scales from 25 on small mobile screens to 85 on desktop displays
    const rawCount = Math.floor(area / 22000);
    const baseCount = Math.max(25, Math.min(85, rawCount));

    switch (densitySetting) {
      case 'low':
        return Math.max(15, Math.floor(baseCount * 0.6));
      case 'high':
        return Math.min(85, Math.floor(baseCount * 1.3));
      case 'medium':
      default:
        return baseCount;
    }
  };

  // Synchronize theme color from CSS variables
  const updateThemeColor = () => {
    if (colorProp) {
      themeRgbRef.current = parseColorToRgb(colorProp);
      return;
    }
    if (typeof window === 'undefined') return;

    const computed = window.getComputedStyle(document.documentElement);
    const particleVar = computed.getPropertyValue('--particle-color').trim();
    const accentVar = computed.getPropertyValue('--accent-primary').trim();
    const effectiveColor = particleVar || accentVar || '#00f0ff';

    themeRgbRef.current = parseColorToRgb(effectiveColor);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect reduced motion preference
    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    reducedMotionRef.current = motionQuery.matches;

    // Initial theme color reading
    updateThemeColor();

    // DOM MutationObserver to detect immediate data-theme attribute updates
    const observer = new MutationObserver(() => {
      updateThemeColor();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });

    // Custom window themechange event listener
    const handleThemeChangeEvent = () => {
      updateThemeColor();
    };
    window.addEventListener('themechange', handleThemeChangeEvent);

    // Resize handler handling devicePixelRatio High-DPI support (capped at 2)
    const handleResize = () => {
      if (!canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      boundsRef.current = { width, height, dpr };

      // Adjust particle population smoothly on screen resize
      const effectiveDensity = densityProp || storeDensity || 'medium';
      const targetCount = computeParticleCount(width, height, effectiveDensity);
      const currentParticles = particlesRef.current;

      if (currentParticles.length < targetCount) {
        const toAdd = targetCount - currentParticles.length;
        for (let i = 0; i < toAdd; i++) {
          currentParticles.push(new Particle(boundsRef.current));
        }
      } else if (currentParticles.length > targetCount) {
        particlesRef.current = currentParticles.slice(0, targetCount);
      }
    };

    handleResize();

    // Mouse and Touch Interaction Listeners
    const handleMouseMove = (e) => {
      pointerRef.current.targetX = e.clientX;
      pointerRef.current.targetY = e.clientY;
      pointerRef.current.isActive = true;
      pointerRef.current.isTouch = false;
      pointerRef.current.radius = 120; // 120px mouse repulsion radius
    };

    const handleMouseLeave = () => {
      pointerRef.current.isActive = false;
      pointerRef.current.targetX = -9999;
      pointerRef.current.targetY = -9999;
    };

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        pointerRef.current.targetX = e.touches[0].clientX;
        pointerRef.current.targetY = e.touches[0].clientY;
        pointerRef.current.x = pointerRef.current.targetX;
        pointerRef.current.y = pointerRef.current.targetY;
        pointerRef.current.isActive = true;
        pointerRef.current.isTouch = true;
        pointerRef.current.radius = 80; // 80px touch drag radius
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        pointerRef.current.targetX = e.touches[0].clientX;
        pointerRef.current.targetY = e.touches[0].clientY;
        pointerRef.current.isActive = true;
        pointerRef.current.isTouch = true;
        pointerRef.current.radius = 80;
      }
    };

    const handleTouchEnd = () => {
      pointerRef.current.isActive = false;
      pointerRef.current.targetX = -9999;
      pointerRef.current.targetY = -9999;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseout', handleMouseLeave, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Render loop
    const render = () => {
      const { width, height, dpr } = boundsRef.current;
      const rgb = themeRgbRef.current;
      const pointer = pointerRef.current;

      // Pointer coordinate smooth damping
      if (pointer.isActive) {
        pointer.x += (pointer.targetX - pointer.x) * 0.25;
        pointer.y += (pointer.targetY - pointer.y) * 0.25;
      } else {
        pointer.x = -9999;
        pointer.y = -9999;
      }

      // Reset transform and clear logical viewport
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;

      // Draw constellation network lines between nearby particles (< 100px)
      const maxLineDist = 100;
      const maxLineDistSq = maxLineDist * maxLineDist;
      ctx.lineWidth = 0.75;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxLineDistSq) {
            // Euclidean distance
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / maxLineDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineAlpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      // Interactive lines connecting nearby particles to cursor/touch
      if (pointer.isActive) {
        const pointerLineMax = pointer.radius * 0.85;
        const pointerLineMaxSq = pointerLineMax * pointerLineMax;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < pointerLineMaxSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / pointerLineMax) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      // Draw glowing particles
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      ctx.shadowBlur = 6;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reducedMotionRef.current) {
          p.update(boundsRef.current, pointer);
        }
        p.draw(ctx, rgb);
      }

      ctx.shadowBlur = 0;

      // Schedule next frame if not reduced motion or paused
      if (!reducedMotionRef.current) {
        rafIdRef.current = requestAnimationFrame(render);
      }
    };

    // Render single static frame for reduced motion users
    const renderStaticFrame = () => {
      render();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    // Page Visibility API: pause animation loop when backgrounded
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else {
        if (!rafIdRef.current && !reducedMotionRef.current) {
          rafIdRef.current = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Motion preference change listener
    const handleMotionChange = (e) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) {
        renderStaticFrame();
      } else if (!document.hidden && !rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(render);
      }
    };

    if (motionQuery && motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (motionQuery && motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange);
    }

    // Start simulation loop
    if (reducedMotionRef.current) {
      renderStaticFrame();
    } else {
      rafIdRef.current = requestAnimationFrame(render);
    }

    // Clean teardown and unmount cleanup
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      observer.disconnect();
      window.removeEventListener('themechange', handleThemeChangeEvent);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (motionQuery && motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else if (motionQuery && motionQuery.removeListener) {
        motionQuery.removeListener(handleMotionChange);
      }

      particlesRef.current = [];
    };
  }, [densityProp, colorProp, storeDensity, storeThemePreset]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
}
