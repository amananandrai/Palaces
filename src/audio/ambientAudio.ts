// Procedural Web Audio API synthesizer for gentle stream water, garden breeze,
// and Hirajoshi pentatonic koto plucks — zero external audio file dependencies.

export class SanctuaryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private pluckTimer: number | null = null;
  private isPlaying = false;
  private volume = 0.55;
  private windStrength = 0.9;

  // D Hirajoshi pentatonic frequencies (D4, E4, F4, A4, Bb4, D5, E5, F5, A5)
  private readonly kotoNotes = [293.66, 329.63, 349.23, 440.0, 466.16, 587.33, 659.25, 698.46, 880.0];

  public async start(volume: number, windStrength: number): Promise<void> {
    this.volume = volume;
    this.windStrength = windStrength;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupGraph();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.45, this.ctx.currentTime, 0.35);
    }

    this.isPlaying = true;
    this.scheduleNextPluck();
  }

  private setupGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    // Create 4 seconds of soft pink-ish noise buffer for water stream & breeze
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.06;
    }

    // Stream & pond water ambience (gentle warm bandpass water trickle)
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = noiseBuffer;
    waterSrc.loop = true;

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.value = 620;
    waterFilter.Q.value = 0.7;

    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.32;

    waterSrc.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(this.masterGain);
    waterSrc.start();

    // Garden wind breeze modulated subtly by windStrength
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 260 + this.windStrength * 180;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.12 + this.windStrength * 0.1;

    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSrc.start();
  }

  private playKotoNote(freq: number): void {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + 2.4);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 2.9);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 3.0);
    osc2.stop(now + 3.0);
  }

  private scheduleNextPluck(): void {
    if (!this.isPlaying) return;
    if (this.pluckTimer !== null) {
      window.clearTimeout(this.pluckTimer);
    }
    const delayMs = 1800 + Math.random() * 2600;
    this.pluckTimer = window.setTimeout(() => {
      if (!this.isPlaying) return;
      const note = this.kotoNotes[Math.floor(Math.random() * this.kotoNotes.length)];
      this.playKotoNote(note);
      this.scheduleNextPluck();
    }, delayMs);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.ctx && this.masterGain && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.45, this.ctx.currentTime, 0.15);
    }
  }

  public setWindStrength(windStrength: number): void {
    this.windStrength = windStrength;
    if (this.ctx && this.windFilter && this.windGain) {
      this.windFilter.frequency.setTargetAtTime(260 + windStrength * 190, this.ctx.currentTime, 0.25);
      this.windGain.gain.setTargetAtTime(0.1 + windStrength * 0.1, this.ctx.currentTime, 0.25);
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.pluckTimer !== null) {
      window.clearTimeout(this.pluckTimer);
      this.pluckTimer = null;
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  public dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
