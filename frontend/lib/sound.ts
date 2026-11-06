/**
 * sound.ts - Web Audio API Synthesizer for EssenShare Food & Notification Alerts.
 * 
 * Generates an uplifting, warm chime tone (three-tone harmonic bell) using pure browser
 * synthesis with exponential gain envelopes. Zero external audio files required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('ess_sound_enabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ess_sound_enabled', enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('ess_sound_setting_changed', { detail: { enabled } }));
}

/**
 * Play a warm harmonic chime (D5 -> A5 -> D6 bell)
 */
export function playFoodAlertChime(): void {
  if (!isSoundEnabled()) return;
  playSynthesizedBell();
}

/**
 * Play test chime (plays regardless of current mute state so user can preview)
 */
export function playTestChime(): void {
  playSynthesizedBell();
}

function playSynthesizedBell(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic bell chord progression: D5 (587.33Hz) -> F#5 (739.99Hz) -> A5 (880Hz)
    const tones = [
      { freq: 587.33, startTime: now + 0.00, duration: 0.7, gain: 0.18 },
      { freq: 739.99, startTime: now + 0.08, duration: 0.8, gain: 0.22 },
      { freq: 880.00, startTime: now + 0.16, duration: 1.0, gain: 0.25 },
    ];

    tones.forEach(({ freq, startTime, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with subtle triangle warmth
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Organic bell envelope: instant gentle attack, exponential decay
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    // Non-fatal if audio context is blocked by strict autoplay policy
    console.debug('[Sound] Audio chime playback bypassed:', err);
  }
}
