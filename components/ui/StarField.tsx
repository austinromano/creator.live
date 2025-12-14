'use client';
import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  vx: number; // velocity x
  vy: number; // velocity y
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  trail: { x: number; y: number; opacity: number }[];
  life: number;
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const lastShootingStarRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateStars();
    };

    const generateStars = () => {
      const stars: Star[] = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 2500); // More stars

      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 0.6 + 0.2, // 0.2 to 0.8px (smaller)
          opacity: Math.random() * 0.5 + 0.4, // 0.4 to 0.9 (brighter)
          twinkleSpeed: Math.random() * 0.001 + 0.0005, // Much slower twinkle
          twinklePhase: Math.random() * Math.PI * 2,
          vx: 0.02, // Slower drift right
          vy: 0.005, // Slower downward drift
        });
      }
      starsRef.current = stars;
    };

    const createShootingStar = () => {
      const startX = Math.random() * canvas.width * 0.5; // Start from left half
      const startY = Math.random() * canvas.height * 0.3; // Start from top third
      return {
        x: startX,
        y: startY,
        vx: 8 + Math.random() * 4, // Fast horizontal speed
        vy: 3 + Math.random() * 2, // Diagonal down
        size: 1.5 + Math.random() * 1,
        opacity: 1,
        trail: [] as { x: number; y: number; opacity: number }[],
        life: 100 + Math.random() * 50,
      };
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        // Move the star
        star.x += star.vx;
        star.y += star.vy;

        // Wrap around edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Calculate twinkling opacity
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const currentOpacity = star.opacity + twinkle * 0.15;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, currentOpacity)})`;
        ctx.fill();
      });

      // Spawn shooting stars randomly (every 10-20 seconds on average)
      if (time - lastShootingStarRef.current > 10000 + Math.random() * 10000) {
        if (Math.random() < 0.5) { // 50% chance when timer is up
          shootingStarsRef.current.push(createShootingStar());
          lastShootingStarRef.current = time;
        }
      }

      // Update and draw shooting stars
      shootingStarsRef.current = shootingStarsRef.current.filter((star) => {
        // Add current position to trail
        star.trail.unshift({ x: star.x, y: star.y, opacity: star.opacity });
        if (star.trail.length > 20) star.trail.pop(); // Limit trail length

        // Move shooting star
        star.x += star.vx;
        star.y += star.vy;
        star.life--;
        star.opacity = Math.max(0, star.life / 100);

        // Draw trail
        star.trail.forEach((point, i) => {
          const trailOpacity = point.opacity * (1 - i / star.trail.length) * 0.6;
          const trailSize = star.size * (1 - i / star.trail.length);
          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
          ctx.fill();
        });

        // Draw shooting star head with glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // Remove if off screen or life ended
        return star.life > 0 && star.x < canvas.width && star.y < canvas.height;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'transparent' }}
      />
      {/* Subtle gradient glow at bottom like Sora */}
      <div
        className="fixed bottom-0 left-0 right-0 h-96 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(88, 28, 135, 0.15) 0%, transparent 60%)',
        }}
      />
    </>
  );
}
