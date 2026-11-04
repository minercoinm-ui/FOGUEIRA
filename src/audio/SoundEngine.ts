/**
 * Procedural Web Audio Sound Engine for FOGUEIRA
 * Generates campfire crackle & pops, night crickets, soft wind, footsteps, and interaction tones.
 * Zero external audio file dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Master Gain
  private masterGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Loops / Oscillators / Nodes
  private fireNoiseNode: AudioNode | null = null;
  private windNode: AudioNode | null = null;
  private cricketOsc1: OscillatorNode | null = null;
  private cricketOsc2: OscillatorNode | null = null;
  private cricketGain: GainNode | null = null;
  private cricketIntervalId: number | null = null;
  private popIntervalId: number | null = null;

  // Positional parameters
  private listenerPos: [number, number, number] = [0, 1.6, 0];
  private firePos: [number, number, number] = [0, 0.4, 0];

  public init(): void {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Sub-busses
      this.fireGain = this.ctx.createGain();
      this.fireGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.fireGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startCampfireContinuous();
      this.startCampfirePops();
      this.startNightWind();
      this.startNightCrickets();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio could not initialize yet:', e);
    }
  }

  /**
   * Continuous low rumble / hiss of campfire flame
   */
  private startCampfireContinuous(): void {
    if (!this.ctx || !this.fireGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, this.ctx.currentTime);

    // Subtle bandpass for licking flames
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'peaking';
    bandpass.frequency.setValueAtTime(260, this.ctx.currentTime);
    bandpass.gain.setValueAtTime(4, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(bandpass);
    bandpass.connect(this.fireGain);

    whiteNoise.start(0);
    this.fireNoiseNode = whiteNoise;
  }

  /**
   * Realistic wood crackles & ember snaps
   */
  private startCampfirePops(): void {
    if (!this.ctx || !this.fireGain) return;

    const triggerPop = () => {
      if (!this.ctx || !this.fireGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const isBigSnap = Math.random() < 0.22;
      const duration = isBigSnap ? 0.06 : 0.025;

      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Sharp resonant frequency like dry wood fiber cracking
      const baseFreq = isBigSnap ? 1200 + Math.random() * 800 : 2200 + Math.random() * 2600;
      osc.type = isBigSnap ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.2, now + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(isBigSnap ? 5 : 8, now);

      const amp = isBigSnap ? 0.45 : 0.22;
      popGain.gain.setValueAtTime(0.001, now);
      popGain.gain.linearRampToValueAtTime(amp, now + 0.002);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(popGain);
      popGain.connect(this.fireGain);

      osc.start(now);
      osc.stop(now + duration + 0.01);
    };

    const scheduleNext = () => {
      triggerPop();
      const delay = 80 + Math.random() * 450;
      this.popIntervalId = window.setTimeout(scheduleNext, delay);
    };

    scheduleNext();
  }

  /**
   * Ambient night wind
   */
  private startNightWind(): void {
    if (!this.ctx || !this.ambientGain) return;

    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // LFO to gently modulate wind frequency and volume
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec wave

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.16, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.ambientGain);

    noise.start(0);
    lfo.start(0);
    this.windNode = noise;
  }

  /**
   * Gentle night crickets / cicadas in the rural night
   */
  private startNightCrickets(): void {
    if (!this.ctx || !this.ambientGain) return;

    const cricketGain = this.ctx.createGain();
    cricketGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    cricketGain.connect(this.ambientGain);
    this.cricketGain = cricketGain;

    const triggerCricketPulse = () => {
      if (!this.ctx || !this.cricketGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const pulseGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(4600 + (Math.random() * 200 - 100), now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(4650 + (Math.random() * 200 - 100), now);

      // Fast chirp rhythm (3-4 fast micro-pulses)
      const chirpDur = 0.045;
      pulseGain.gain.setValueAtTime(0.001, now);
      for (let p = 0; p < 3; p++) {
        const t = now + p * (chirpDur + 0.02);
        pulseGain.gain.setValueAtTime(0.001, t);
        pulseGain.gain.linearRampToValueAtTime(0.12, t + 0.015);
        pulseGain.gain.linearRampToValueAtTime(0.001, t + chirpDur);
      }

      osc.connect(pulseGain);
      osc2.connect(pulseGain);
      pulseGain.connect(this.cricketGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.25);
      osc2.stop(now + 0.25);
    };

    const scheduleCrickets = () => {
      triggerCricketPulse();
      const nextDelay = 1200 + Math.random() * 1800;
      this.cricketIntervalId = window.setTimeout(scheduleCrickets, nextDelay);
    };

    scheduleCrickets();
  }

  /**
   * Footstep sound when walking on grass/earth
   */
  public playFootstep(isSprinting: boolean = false): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSprinting ? 650 : 480, now);

    const gain = this.ctx.createGain();
    const volume = isSprinting ? 0.22 : 0.12;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /**
   * Interaction sound (sitting down, opening door, UI click)
   */
  public playInteractionTone(
    type: 'sit' | 'stand' | 'message' | 'click' | 'celebrate' | 'talk' = 'click'
  ): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'sit') {
      // Warm rustic wooden creak / thud
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (type === 'stand') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'message') {
      // Gentle chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.06); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'celebrate') {
      // Joyous rural harmonica / folk accordion chord (arpeggiated)
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        noteOsc.type = 'triangle';
        const startT = now + idx * 0.07;
        noteOsc.frequency.setValueAtTime(freq, startT);
        noteGain.gain.setValueAtTime(0.001, startT);
        noteGain.gain.linearRampToValueAtTime(0.18, startT + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);
        noteOsc.connect(noteGain);
        noteGain.connect(this.sfxGain);
        noteOsc.start(startT);
        noteOsc.stop(startT + 0.42);
      });
    } else if (type === 'talk') {
      // Soft conversational chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.06);
      osc.frequency.linearRampToValueAtTime(360, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  /**
   * Update spatial campfire volume based on player distance
   */
  public updatePlayerPosition(px: number, py: number, pz: number): void {
    this.listenerPos = [px, py, pz];
    if (!this.fireGain || !this.ctx) return;

    const dx = px - this.firePos[0];
    const dy = py - this.firePos[1];
    const dz = pz - this.firePos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Campfire is loudest within 4m, smoothly fades to 0.1 at 35m
    const maxDist = 36;
    const clampedDist = Math.max(2, Math.min(maxDist, distance));
    const factor = Math.max(0.08, 1 - (clampedDist - 2) / (maxDist - 2));

    const targetGain = factor * 0.7;
    this.fireGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
  }

  public setVolumes(master: number, fire: number, ambient: number, sfx: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(master, now, 0.05);
    if (this.ambientGain) this.ambientGain.gain.setTargetAtTime(ambient, now, 0.05);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(sfx, now, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public dispose(): void {
    if (this.popIntervalId) clearInterval(this.popIntervalId);
    if (this.cricketIntervalId) clearInterval(this.cricketIntervalId);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

export const soundEngine = new SoundEngine();
