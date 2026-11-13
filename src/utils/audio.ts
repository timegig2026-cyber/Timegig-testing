// TimeGiG Web Audio Synthesizer Engine
// Produces crisp, instant, audible UI feedback sounds without external audio assets

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Crisp, pleasant UI click sound played every time user taps an icon feature
   */
  public playFeatureClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pleasant high-definition UI chirp (520Hz -> 820Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch (e) {
      console.warn('Audio playback suppressed:', e);
    }
  }

  /**
   * Ascending chime for subscription activation or completing an action
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const start = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const time = start + idx * 0.065;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch (e) {
      console.warn('Success chime error:', e);
    }
  }

  /**
   * GPS / Navigation announcement bell chime before the lady voice speaks
   */
  public playNavigationChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High ding-dong chime
      const tones = [
        { freq: 880, time: 0, dur: 0.2 },
        { freq: 1174.66, time: 0.12, dur: 0.28 },
      ];

      tones.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, now + t.time);

        gain.gain.setValueAtTime(0.22, now + t.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t.time + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t.time);
        osc.stop(now + t.time + t.dur + 0.02);
      });
    } catch (e) {
      console.warn('Nav chime error:', e);
    }
  }

  /**
   * Vibrant, resonant chime alert played whenever a new seeker or referral
   * joins and submits their subscription.
   */
  public playNewSubmissionAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const triggerNotes = () => {
        const now = ctx.currentTime;
        // Celebratory 4-note bell chime sequence:
        // D5 (587.33Hz) -> A5 (880Hz) -> D6 (1174.66Hz) -> F#6 (1479.98Hz)
        const chimeNotes = [
          { freq: 587.33, delay: 0.0, dur: 0.45, gain: 0.35 },
          { freq: 880.0, delay: 0.09, dur: 0.5, gain: 0.4 },
          { freq: 1174.66, delay: 0.18, dur: 0.55, gain: 0.45 },
          { freq: 1479.98, delay: 0.28, dur: 0.75, gain: 0.48 },
        ];

        chimeNotes.forEach((note) => {
          const time = now + note.delay;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.freq, time);

          const overtone = ctx.createOscillator();
          const overtoneGain = ctx.createGain();
          overtone.type = 'triangle';
          overtone.frequency.setValueAtTime(note.freq * 2, time);

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(note.gain, time + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, time + note.dur);

          overtoneGain.gain.setValueAtTime(0, time);
          overtoneGain.gain.linearRampToValueAtTime(note.gain * 0.35, time + 0.012);
          overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + note.dur * 0.6);

          osc.connect(gain);
          overtone.connect(overtoneGain);
          gain.connect(ctx.destination);
          overtoneGain.connect(ctx.destination);

          osc.start(time);
          overtone.start(time);
          osc.stop(time + note.dur + 0.05);
          overtone.stop(time + note.dur * 0.6 + 0.05);
        });
      };

      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => {
            if (ctx.state === 'running') {
              triggerNotes();
            }
          })
          .catch(() => {
            const unlockAndPlay = () => {
              window.removeEventListener('pointerdown', unlockAndPlay);
              window.removeEventListener('keydown', unlockAndPlay);
              ctx.resume().then(triggerNotes).catch(() => {});
            };
            window.addEventListener('pointerdown', unlockAndPlay, { once: true });
            window.addEventListener('keydown', unlockAndPlay, { once: true });
          });
      } else {
        triggerNotes();
      }
    } catch (e) {
      console.warn('New submission sound alert error:', e);
    }
  }

  /**
   * Alert tone for warnings or timeout notifications
   */
  public playAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Alert audio error:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
