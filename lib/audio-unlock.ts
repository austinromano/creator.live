// Audio unlock utility for iOS Safari
// iOS requires user interaction before audio/video can autoplay
// This creates a silent AudioContext on first interaction to "unlock" media playback

let audioUnlocked = false;
let audioContext: AudioContext | null = null;

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export function unlockAudio(): Promise<void> {
  if (audioUnlocked) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        audioUnlocked = true;
        resolve();
        return;
      }

      audioContext = new AudioContextClass();

      // Create a silent buffer and play it
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Resume context if suspended (iOS Safari)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          audioUnlocked = true;
          resolve();
        });
      } else {
        audioUnlocked = true;
        resolve();
      }
    } catch (e) {
      // If anything fails, just mark as unlocked and continue
      audioUnlocked = true;
      resolve();
    }
  });
}

// Auto-unlock on first user interaction
export function setupAutoUnlock(): void {
  if (typeof window === 'undefined') return;

  const events = ['touchstart', 'touchend', 'click', 'keydown', 'scroll'];

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
