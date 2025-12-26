
class SoundService {
  private ctx: AudioContext | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private isBgmPlaying: boolean = false;
  private sfxVolume: number = 0.5;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    const finalVolume = volume * this.sfxVolume;
    
    gain.gain.setValueAtTime(finalVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  setSFXVolume(vol: number) {
    this.sfxVolume = vol;
  }

  playHover() {
    this.playTone(1200, 'sine', 0.05, 0.05);
  }

  playSelect() {
    this.playTone(880, 'sine', 0.08, 0.3);
  }

  playDrop() {
    this.playTone(220, 'sine', 0.2, 0.6);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 0.4);
  }

  playWin() {
    const tones = [523.25, 659.25, 783.99, 1046.50];
    tones.forEach((t, i) => {
      setTimeout(() => this.playTone(t, 'sine', 0.8, 0.4), i * 150);
    });
  }

  playLevelUp() {
    this.playTone(1320, 'sine', 0.4, 0.3);
  }

  playUndo() {
    this.playTone(440, 'sine', 0.15, 0.4);
  }

  startBGM() {
    if (this.isBgmPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.bgmGain = this.ctx.createGain();
    this.bgmFilter = this.ctx.createBiquadFilter();
    this.bgmGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    
    this.bgmFilter.type = 'lowpass';
    this.bgmFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    const createOsc = (freq: number) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      osc.connect(this.bgmFilter!);
      osc.start();
      return osc;
    };

    createOsc(55);
    createOsc(82.41);

    this.bgmFilter.connect(this.bgmGain);
    this.bgmGain.connect(this.ctx.destination);

    this.isBgmPlaying = true;
  }

  setBGMVolume(vol: number) {
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(vol * 0.05, this.ctx.currentTime, 0.1);
    }
  }
}

export const sounds = new SoundService();
