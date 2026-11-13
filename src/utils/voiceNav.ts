// TimeGiG Lady Voice GPS Navigation Engine
import { soundEngine } from './audio';

class LadyVoiceNavigator {
  private isMuted: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private femaleVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private lastSpokenText: string = '';
  private lastSpokenAt: number = 0;
  private onStatusChangeCallbacks: Set<(speaking: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoice();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoice();
      };
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioritize high-quality natural female English voices
    const preferredNames = [
      'google uk english female',
      'google us english',
      'samantha',
      'victoria',
      'karen',
      'moira',
      'tessa',
      'zira',
      'salli',
      'joanna',
      'fiona',
      'kate',
      'veena',
      'catherine',
      'stephanie',
      'serena',
      'female'
    ];

    // 1. Exact or substring match in English
    let found = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const langLower = v.lang.toLowerCase();
      const isEnglish = langLower.startsWith('en');
      return isEnglish && preferredNames.some(p => nameLower.includes(p));
    });

    // 2. Any English voice with "female" or "woman"
    if (!found) {
      found = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return (nameLower.includes('female') || nameLower.includes('woman'));
      });
    }

    // 3. Any standard English voice
    if (!found) {
      found = voices.find(v => v.lang.startsWith('en'));
    }

    // 4. Default voice
    this.femaleVoice = found || voices[0] || null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public onStatusChange(callback: (speaking: boolean) => void) {
    this.onStatusChangeCallbacks.add(callback);
    return () => {
      this.onStatusChangeCallbacks.delete(callback);
    };
  }

  private notifyStatus(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onStatusChangeCallbacks.forEach(cb => cb(speaking));
  }

  /**
   * Speak brief navigational guidance in a natural lady voice without chattiness
   */
  public speak(text: string, options: { playChime?: boolean; force?: boolean; onEnd?: () => void } = {}) {
    const cleanText = text.trim();
    if (!cleanText || this.isMuted) {
      options.onEnd?.();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      options.onEnd?.();
      return;
    }

    // Avoid repeating identical instruction within 10 seconds unless explicitly forced (e.g. Repeat button)
    const now = Date.now();
    if (!options.force && cleanText === this.lastSpokenText && now - this.lastSpokenAt < 10000) {
      options.onEnd?.();
      return;
    }
    this.lastSpokenText = cleanText;
    this.lastSpokenAt = now;

    try {
      window.speechSynthesis.cancel();

      if (options.playChime !== false) {
        soundEngine.playNavigationChime();
      }

      // Small delay after chime to let speech begin naturally
      setTimeout(() => {
        if (!this.femaleVoice) {
          this.initVoice();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (this.femaleVoice) {
          utterance.voice = this.femaleVoice;
        }

        // Tuned for clear, concise female navigation voice
        utterance.pitch = 1.12;
        utterance.rate = 1.05;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          this.notifyStatus(true);
        };

        utterance.onend = () => {
          this.notifyStatus(false);
          this.currentUtterance = null;
          options.onEnd?.();
        };

        utterance.onerror = (e) => {
          console.warn('Voice navigation speech error:', e);
          this.notifyStatus(false);
          this.currentUtterance = null;
          options.onEnd?.();
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }, options.playChime !== false ? 150 : 0);
    } catch (err) {
      console.warn('Failed to speak with lady voice navigator:', err);
      this.notifyStatus(false);
      options.onEnd?.();
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.notifyStatus(false);
      this.currentUtterance = null;
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

export const ladyVoiceNavigator = new LadyVoiceNavigator();
