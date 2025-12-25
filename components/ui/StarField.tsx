'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleDuration: number;
  twinkleDelay: number;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  length: number;
}

// Deterministic pseudo-random
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

const generateSimpleStars = (count: number, seed: number): Star[] => {
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const r1 = seededRandom(seed + i);
    const r2 = seededRandom(seed + i * 2);
    const r3 = seededRandom(seed + i * 3);
    const r4 = seededRandom(seed + i * 4);
    const r5 = seededRandom(seed + i * 5);
    const r6 = seededRandom(seed + i * 6);

    stars.push({
      id: seed * 10000 + i,
      x: r1 * 100,
      y: r2 * 100,
      size: 1 + r3 * 1.5, // 1-2.5px
      brightness: 0.6 + r4 * 0.4, // 0.6-1
      twinkleDuration: 3 + r5 * 4, // 3-7 seconds
      twinkleDelay: r6 * 6,
    });
  }

  return stars;
};

// Simple, subtle star
const SimpleStar = React.memo(({ star }: { star: Star }) => {
  return (
    <motion.div
      className="absolute rounded-full bg-white"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        boxShadow: `0 0 ${star.size * 2}px ${star.size * 0.5}px rgba(255, 255, 255, 0.6)`,
      }}
      animate={{
        opacity: [
          star.brightness,
          star.brightness * 0.4,
          star.brightness * 0.8,
          star.brightness * 0.5,
          star.brightness,
        ],
      }}
      transition={{
        duration: star.twinkleDuration,
        delay: star.twinkleDelay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
});
SimpleStar.displayName = 'SimpleStar';

// Shooting star
const ShootingStarEffect = ({ star, onComplete }: { star: ShootingStar; onComplete: () => void }) => {
  return (
    <motion.div
      className="absolute"
      style={{
        left: star.startX,
        top: star.startY,
        width: star.length,
        height: 2,
        background: `linear-gradient(to right, transparent, rgba(255,255,255,0.3), rgba(255,255,255,0.9), white)`,
        borderRadius: '50%',
        transformOrigin: 'right center',
        transform: `rotate(${star.angle}deg)`,
        boxShadow: '0 0 10px 2px rgba(255,255,255,0.5)',
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 0,
        scaleX: 0.3,
      }}
      animate={{
        x: Math.cos(star.angle * Math.PI / 180) * 500,
        y: Math.sin(star.angle * Math.PI / 180) * 500,
        opacity: [0, 1, 1, 0],
        scaleX: [0.3, 1, 1, 0.5],
      }}
      transition={{
        duration: star.speed,
        ease: 'easeOut',
        opacity: { times: [0, 0.1, 0.6, 1] },
      }}
      onAnimationComplete={onComplete}
    />
  );
};

// Flowing clouds with horizontal drift like real clouds
const FlowingClouds = () => (
  <>
    {/* Large purple cloud - drifts right */}
    <motion.div
      className="absolute top-0 left-0 w-[70vw] h-[50vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.15) 35%, transparent 70%)',
        filter: 'blur(80px)',
      }}
      animate={{
        x: [-100, 150],
        y: [0, -15, 0],
        scale: [1, 1.05, 1],
        opacity: [0.5, 0.7, 0.5],
      }}
      transition={{
        x: { duration: 80, repeat: Infinity, ease: 'linear' },
        y: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 25, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 30, repeat: Infinity, ease: 'easeInOut' },
      }}
    />

    {/* Pink-purple cloud - drifts left */}
    <motion.div
      className="absolute top-[20%] right-[5%] w-[65vw] h-[55vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.35) 0%, rgba(217, 70, 239, 0.2) 40%, transparent 70%)',
        filter: 'blur(90px)',
      }}
      animate={{
        x: [100, -150],
        y: [0, 10, 0],
        scale: [1, 1.08, 1],
        opacity: [0.6, 0.8, 0.6],
      }}
      transition={{
        x: { duration: 90, repeat: Infinity, ease: 'linear' },
        y: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 28, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 32, repeat: Infinity, ease: 'easeInOut' },
      }}
    />

    {/* Large flowing cloud - drifts right slowly */}
    <motion.div
      className="absolute top-[35%] left-[15%] w-[75vw] h-[60vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(192, 132, 252, 0.25) 0%, rgba(168, 85, 247, 0.15) 45%, transparent 75%)',
        filter: 'blur(100px)',
      }}
      animate={{
        x: [-120, 120],
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
        opacity: [0.55, 0.75, 0.55],
      }}
      transition={{
        x: { duration: 100, repeat: Infinity, ease: 'linear' },
        y: { duration: 25, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 30, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 35, repeat: Infinity, ease: 'easeInOut' },
      }}
    />

    {/* Pink cloud - drifts left */}
    <motion.div
      className="absolute top-[50%] right-[20%] w-[60vw] h-[50vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.3) 0%, rgba(217, 70, 239, 0.18) 40%, transparent 70%)',
        filter: 'blur(85px)',
      }}
      animate={{
        x: [80, -140],
        y: [0, 12, 0],
        scale: [1, 1.06, 1],
        opacity: [0.65, 0.85, 0.65],
      }}
      transition={{
        x: { duration: 75, repeat: Infinity, ease: 'linear' },
        y: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 28, repeat: Infinity, ease: 'easeInOut' },
      }}
    />

    {/* Orange-pink cloud - drifts right */}
    <motion.div
      className="absolute bottom-[5%] left-[10%] w-[70vw] h-[45vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(251, 146, 60, 0.25) 0%, rgba(249, 115, 22, 0.15) 40%, transparent 70%)',
        filter: 'blur(95px)',
      }}
      animate={{
        x: [-90, 160],
        y: [0, -8, 0],
        scale: [1, 1.04, 1],
        opacity: [0.6, 0.8, 0.6],
      }}
      transition={{
        x: { duration: 85, repeat: Infinity, ease: 'linear' },
        y: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 26, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 30, repeat: Infinity, ease: 'easeInOut' },
      }}
    />

    {/* Coral-pink accent - drifts left */}
    <motion.div
      className="absolute top-[60%] right-0 w-[55vw] h-[48vh]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(244, 114, 182, 0.28) 0%, rgba(236, 72, 153, 0.16) 45%, transparent 72%)',
        filter: 'blur(88px)',
      }}
      animate={{
        x: [70, -130],
        y: [0, 15, 0],
        scale: [1, 1.07, 1],
        opacity: [0.58, 0.78, 0.58],
      }}
      transition={{
        x: { duration: 70, repeat: Infinity, ease: 'linear' },
        y: { duration: 19, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 24, repeat: Infinity, ease: 'easeInOut' },
        opacity: { duration: 27, repeat: Infinity, ease: 'easeInOut' },
      }}
    />
  </>
);

export function StarField() {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Minimal stars for clean look
  const stars = useMemo(() => isClient ? generateSimpleStars(60, 1) : [], [isClient]);

  const spawnShootingStar = useCallback(() => {
    const newStar: ShootingStar = {
      id: Date.now() + Math.random(),
      startX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth * 0.7 : 800),
      startY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300),
      angle: 30 + Math.random() * 20,
      speed: 1 + Math.random() * 0.5,
      length: 80 + Math.random() * 60,
    };
    setShootingStars(prev => [...prev, newStar]);
  }, []);

  const removeShootingStar = useCallback((id: number) => {
    setShootingStars(prev => prev.filter(s => s.id !== id));
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const initialTimeout = setTimeout(() => {
      spawnShootingStar();
    }, 4000);

    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 15000; // 10-25 seconds
      return setTimeout(() => {
        spawnShootingStar();
        scheduleNext();
      }, delay);
    };

    const timeout = scheduleNext();
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeout);
    };
  }, [isClient, spawnShootingStar]);

  if (!isClient) {
    return <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Vibrant gradient background - purple to pink to orange like sky.money */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgb(88, 28, 135) 0%,
            rgb(109, 40, 217) 15%,
            rgb(147, 51, 234) 30%,
            rgb(168, 85, 247) 45%,
            rgb(217, 70, 239) 60%,
            rgb(236, 72, 153) 75%,
            rgb(251, 146, 60) 90%,
            rgb(249, 115, 22) 100%
          )`,
        }}
      />

      {/* Flowing clouds */}
      <FlowingClouds />

      {/* Subtle stars */}
      <div className="absolute inset-0">
        {stars.map(star => <SimpleStar key={star.id} star={star} />)}
      </div>

      {/* Shooting stars */}
      <AnimatePresence>
        {shootingStars.map(star => (
          <ShootingStarEffect
            key={star.id}
            star={star}
            onComplete={() => removeShootingStar(star.id)}
          />
        ))}
      </AnimatePresence>

      {/* Subtle overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.1) 100%)',
        }}
      />
    </div>
  );
}
