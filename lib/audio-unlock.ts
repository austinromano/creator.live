// Audio unlock utility for iOS Safari
// iOS requires user interaction before audio/video can autoplay
// This creates a silent AudioContext on first interaction to "unlock" media playback

let audioUnlocked = false;
let audioContext: AudioContext | null = null;
let unlockCallbacks: Set<() => void> = new Set(); // Use Set to prevent duplicate callbacks
let isUnlocking = false; // Prevent multiple unlock attempts

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

// Register callback for audio unlock - uses Set to prevent duplicates
export function onAudioUnlock(callback: () => void): void {
  if (audioUnlocked) {
    callback();
  } else {
    unlockCallbacks.add(callback);
  }
}

// Remove a specific callback (for cleanup)
export function offAudioUnlock(callback: () => void): void {
  unlockCallbacks.delete(callback);
}

// Helper to cleanup and notify callbacks
function completeUnlock(): void {
  audioUnlocked = true;
  unlockCallbacks.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Audio unlock callback error:', e);
    }
  });
  unlockCallbacks.clear();
  isUnlocking = false;
}

export function unlockAudio(): Promise<void> {
  if (audioUnlocked) return Promise.resolve();
  if (isUnlocking) return Promise.resolve(); // Already attempting unlock

  isUnlocking = true;

  return new Promise((resolve) => {
    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        completeUnlock();
        resolve();
        return;
      }

      // Reuse existing context if available
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextClass();
      }

      // Create a silent buffer and play it
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Disconnect source after it plays to prevent memory leak
      source.onended = () => {
        try {
          source.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      };

      // Resume context if suspended (iOS Safari)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          completeUnlock();
          resolve();
        }).catch(() => {
          // Resume failed, but still mark as unlocked
          completeUnlock();
          resolve();
        });
      } else {
        completeUnlock();
        resolve();
      }
    } catch (e) {
      // If anything fails, just mark as unlocked and continue
      completeUnlock();
      resolve();
    }
  });
}

// Auto-unlock on first user interaction
export function setupAutoUnlock(): void {
  if (typeof window === 'undefined') return;
  if (audioUnlocked) return; // Already unlocked

  // Check if already unlocked (non-iOS or user already interacted)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const testCtx = new AudioContextClass();
      const isRunning = testCtx.state === 'running';
      testCtx.close(); // Always close test context
      if (isRunning) {
        audioUnlocked = true;
        return;
      }
    }
  } catch (e) {
    // Ignore errors in test
  }

  const events = ['touchstart', 'touchend', 'click', 'keydown', 'scroll', 'mousemove'];

  const unlock = () => {
    unlockAudio().then(() => {
      // Remove all listeners after unlock
      events.forEach(event => {
        document.removeEventListener(event, unlock, true);
      });
    });
  };

  events.forEach(event => {
    document.addEventListener(event, unlock, { capture: true, passive: true });
  });
}
