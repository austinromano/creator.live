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
  color: string;
  layer: 'far' | 'mid' | 'near';
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  length: number;
}

// Realistic star colors based on temperature (Kelvin)
const starColors = [
  { color: 'rgb(155, 176, 255)', weight: 0.05 },  // Blue (hot O/B class)
  { color: 'rgb(170, 191, 255)', weight: 0.08 },  // Blue-white (A class)
  { color: 'rgb(202, 215, 255)', weight: 0.12 },  // White (F class)
  { color: 'rgb(248, 247, 255)', weight: 0.20 },  // Yellow-white (G class - like Sun)
  { color: 'rgb(255, 244, 232)', weight: 0.25 },  // Yellow (G/K class)
  { color: 'rgb(255, 222, 180)', weight: 0.18 },  // Orange (K class)
  { color: 'rgb(255, 189, 145)', weight: 0.12 },  // Orange-red (M class)
];

const getRandomStarColor = (rand: number): string => {
  let cumulative = 0;
  for (const { color, weight } of starColors) {
    cumulative += weight;
    if (rand < cumulative) return color;
  }
  return starColors[3].color;
};

// Deterministic pseudo-random
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

const generateRealisticStars = (count: number, layer: 'far' | 'mid' | 'near', seed: number): Star[] => {
  const stars: Star[] = [];

  const sizeRange = layer === 'far' ? [0.5, 1] : layer === 'mid' ? [0.8, 1.8] : [1.2, 3];
  const brightnessRange = layer === 'far' ? [0.3, 0.6] : layer === 'mid' ? [0.5, 0.8] : [0.7, 1];

  for (let i = 0; i < count; i++) {
    const r1 = seededRandom(seed + i);
    const r2 = seededRandom(seed + i * 2);
    const r3 = seededRandom(seed + i * 3);
    const r4 = seededRandom(seed + i * 4);
    const r5 = seededRandom(seed + i * 5);
    const r6 = seededRandom(seed + i * 6);
    const r7 = seededRandom(seed + i * 7);

    // Cluster stars more towards top
    const yBias = r2 * r2;

    stars.push({
      id: seed * 10000 + i,
      x: r1 * 100,
      y: yBias * 85, // Keep in top 85%
      size: sizeRange[0] + r3 * (sizeRange[1] - sizeRange[0]),
      brightness: brightnessRange[0] + r4 * (brightnessRange[1] - brightnessRange[0]),
      twinkleDuration: 2 + r5 * 6, // 2-8 seconds
      twinkleDelay: r6 * 5,
      color: getRandomStarColor(r7),
      layer,
    });
  }

  return stars;
};

// Individual star with realistic twinkle
const RealisticStar = React.memo(({ star }: { star: Star }) => {
  const glowIntensity = star.layer === 'near' ? 0.6 : star.layer === 'mid' ? 0.4 : 0.2;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        backgroundColor: star.color,
        boxShadow: `0 0 ${star.size * 2}px ${star.size}px ${star.color.replace('rgb', 'rgba').replace(')', `, ${glowIntensity})`)}`,
      }}
      animate={{
        opacity: [
          star.brightness,
          star.brightness * 0.6,
          star.brightness * 0.9,
          star.brightness * 0.5,
          star.brightness,
        ],
        scale: [1, 0.9, 1.05, 0.95, 1],
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
RealisticStar.displayName = 'RealisticStar';

// Shooting star with realistic trail
const ShootingStarEffect = ({ star, onComplete }: { star: ShootingStar; onComplete: () => void }) => {
  return (
    <motion.div
      className="absolute"
      style={{
        left: star.startX,
        top: star.startY,
        width: star.length,
        height: 2,
        background: `linear-gradient(to right, transparent, rgba(255,255,255,0.1), rgba(255,255,255,0.8), white)`,
        borderRadius: '50%',
        transformOrigin: 'right center',
        transform: `rotate(${star.angle}deg)`,
        boxShadow: '0 0 10px 2px rgba(255,255,255,0.5), 0 0 20px 4px rgba(180,200,255,0.3)',
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

// Atmospheric glow layer
const AtmosphericGlow = () => (
  <>
    {/* Deep space gradient */}
    <div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
      }}
    />
    {/* Subtle nebula hints */}
    <motion.div
      className="absolute top-0 left-[20%] w-[40vw] h-[30vh] opacity-20"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(100,50,150,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}
      animate={{
        opacity: [0.15, 0.25, 0.18, 0.22, 0.15],
        scale: [1, 1.05, 0.98, 1.02, 1],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute top-[5%] right-[15%] w-[35vw] h-[25vh] opacity-15"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(50,80,150,0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }}
      animate={{
        opacity: [0.12, 0.18, 0.14, 0.2, 0.12],
        scale: [1, 0.97, 1.03, 0.99, 1],
      }}
      transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
    />
  </>
);

export function StarField() {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate layered stars only on client to avoid hydration mismatch
  const farStars = useMemo(() => isClient ? generateRealisticStars(200, 'far', 1) : [], [isClient]);
  const midStars = useMemo(() => isClient ? generateRealisticStars(100, 'mid', 2) : [], [isClient]);
  const nearStars = useMemo(() => isClient ? generateRealisticStars(30, 'near', 3) : [], [isClient]);

  const spawnShootingStar = useCallback(() => {
    const newStar: ShootingStar = {
      id: Date.now() + Math.random(),
      startX: Math.random() * (typeof window !== 'undefined' ? window.innerWidth * 0.7 : 800),
      startY: Math.random() * (typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300),
      angle: 25 + Math.random() * 25, // 25-50 degrees
      speed: 0.8 + Math.random() * 0.4,
      length: 80 + Math.random() * 60,
    };
    setShootingStars(prev => [...prev, newStar]);
  }, []);

  const removeShootingStar = useCallback((id: number) => {
    setShootingStars(prev => prev.filter(s => s.id !== id));
  }, []);

  // Shooting star spawner
  useEffect(() => {
    if (!isClient) return;

    // Spawn one quickly after load
    const initialTimeout = setTimeout(() => {
      spawnShootingStar();
    }, 3000);

    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 12000; // 8-20 seconds
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

  // Don't render anything on server to avoid hydration mismatch
  if (!isClient) {
    return <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Atmospheric effects */}
      <AtmosphericGlow />

      {/* Far stars - smallest, dimmest, most numerous */}
      <div className="absolute inset-0">
        {farStars.map(star => <RealisticStar key={star.id} star={star} />)}
      </div>

      {/* Mid stars */}
      <div className="absolute inset-0">
        {midStars.map(star => <RealisticStar key={star.id} star={star} />)}
      </div>

      {/* Near stars - largest, brightest, fewest */}
      <div className="absolute inset-0">
        {nearStars.map(star => <RealisticStar key={star.id} star={star} />)}
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

      {/* Horizon glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[30vh]"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
