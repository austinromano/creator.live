'use client';
import { motion } from 'framer-motion';
import React from 'react';

export function AuroraBorealis() {
  return (
    <div className="fixed inset-x-0 bottom-0 h-[20vh] pointer-events-none z-0 overflow-hidden">
      {/* Main aurora curtain - green dominant like real aurora */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg,
            rgba(34, 197, 94, 0.4) 0%,
            rgba(74, 222, 128, 0.3) 20%,
            rgba(45, 212, 191, 0.2) 40%,
            rgba(34, 197, 94, 0.15) 60%,
            transparent 100%
          )`,
          filter: 'blur(20px)',
        }}
        animate={{
          opacity: [0.6, 0.8, 0.5, 0.7, 0.6],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Flowing curtain strips */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${i * 20}%`,
            bottom: 0,
            width: '25%',
            height: '100%',
            background: `linear-gradient(0deg,
              rgba(74, 222, 128, ${0.3 - i * 0.03}) 0%,
              rgba(34, 197, 94, ${0.25 - i * 0.02}) 30%,
              rgba(45, 212, 191, ${0.15 - i * 0.01}) 60%,
              transparent 100%
            )`,
            filter: 'blur(15px)',
            transformOrigin: 'bottom center',
          }}
          animate={{
            scaleY: [1, 1.1, 0.95, 1.05, 1],
            x: [0, 15, -10, 8, 0],
            opacity: [0.7, 0.9, 0.6, 0.8, 0.7],
          }}
          transition={{
            duration: 6 + i * 2,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Subtle purple/pink accent - appears occasionally in real aurora */}
      <motion.div
        className="absolute right-[10%] bottom-0 w-[30%] h-[80%]"
        style={{
          background: `radial-gradient(ellipse at bottom,
            rgba(168, 85, 247, 0.15) 0%,
            rgba(139, 92, 246, 0.1) 30%,
            transparent 70%
          )`,
          filter: 'blur(25px)',
        }}
        animate={{
          opacity: [0.3, 0.5, 0.2, 0.4, 0.3],
          x: [-20, 20, -10, 15, -20],
          scale: [1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary green wave */}
      <motion.div
        className="absolute left-[5%] bottom-0 w-[40%] h-[90%]"
        style={{
          background: `linear-gradient(10deg,
            rgba(74, 222, 128, 0.25) 0%,
            rgba(34, 197, 94, 0.2) 40%,
            rgba(16, 185, 129, 0.1) 70%,
            transparent 100%
          )`,
          filter: 'blur(18px)',
        }}
        animate={{
          opacity: [0.5, 0.7, 0.4, 0.6, 0.5],
          x: [0, 30, -15, 20, 0],
          skewX: [0, 2, -1, 1.5, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Bright core streak */}
      <motion.div
        className="absolute left-[30%] bottom-0 w-[15%] h-[70%]"
        style={{
          background: `linear-gradient(0deg,
            rgba(134, 239, 172, 0.4) 0%,
            rgba(74, 222, 128, 0.3) 30%,
            rgba(34, 197, 94, 0.15) 60%,
            transparent 100%
          )`,
          filter: 'blur(12px)',
        }}
        animate={{
          opacity: [0.6, 0.9, 0.5, 0.8, 0.6],
          x: [0, 40, -20, 30, 0],
          scaleX: [1, 1.3, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Teal accent */}
      <motion.div
        className="absolute left-[50%] bottom-0 w-[25%] h-[75%]"
        style={{
          background: `linear-gradient(5deg,
            rgba(45, 212, 191, 0.2) 0%,
            rgba(20, 184, 166, 0.15) 40%,
            transparent 80%
          )`,
          filter: 'blur(20px)',
        }}
        animate={{
          opacity: [0.4, 0.6, 0.3, 0.5, 0.4],
          x: [0, -25, 15, -10, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

    </div>
  );
}
