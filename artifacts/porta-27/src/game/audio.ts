// Lightweight Web Audio synth for ambient/horror sfx. No external assets.

let ctx: AudioContext | null = null;
let muted = false;
let masterGain: GainNode | null = null;
let ambientStarted = false;

function ensureCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const created: AudioContext = new AC();
      ctx = created;
      masterGain = created.createGain();
      masterGain.gain.value = muted ? 0 : 0.6;
      masterGain.connect(created.destination);
    } catch {
      return null;
    }
  }
  const c = ctx;
  if (c && c.state === "suspended") {
    void c.resume();
  }
  return c;
}

export function setMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.6;
}

export function isMuted() {
  return muted;
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function startAmbient() {
  const c = ensureCtx();
  if (!c || !masterGain || ambientStarted) return;
  ambientStarted = true;

  // Low rumble drone
  const osc1 = c.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 55;
  const g1 = c.createGain();
  g1.gain.value = 0.05;
  osc1.connect(g1).connect(masterGain);
  osc1.start();

  const osc2 = c.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 82.4;
  const g2 = c.createGain();
  g2.gain.value = 0.025;
  osc2.connect(g2).connect(masterGain);
  osc2.start();

  // Wind noise
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 4);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 350;
  const wg = c.createGain();
  wg.gain.value = 0.04;
  src.connect(filter).connect(wg).connect(masterGain);
  src.start();

  // Slow LFO on wind
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.08;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.03;
  lfo.connect(lfoG).connect(wg.gain);
  lfo.start();
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.3, attack = 0.01) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(masterGain);
  o.start();
  o.stop(c.currentTime + dur + 0.05);
}

function noiseBurst(dur: number, vol: number, lp = 1200) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lp;
  const g = c.createGain();
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter).connect(g).connect(masterGain);
  src.start();
  src.stop(c.currentTime + dur);
}

export const sfx = {
  hover: () => tone(420, 0.06, "square", 0.07),
  select: () => tone(220, 0.12, "triangle", 0.18),
  doorOpen: () => {
    tone(140, 0.5, "sawtooth", 0.18, 0.02);
    setTimeout(() => tone(95, 0.7, "sawtooth", 0.12), 120);
    setTimeout(() => noiseBurst(0.4, 0.12, 800), 100);
  },
  step: () => noiseBurst(0.08, 0.2, 600),
  hit: () => {
    tone(160, 0.15, "square", 0.3);
    noiseBurst(0.18, 0.35, 1800);
  },
  heal: () => {
    tone(523, 0.1, "sine", 0.2);
    setTimeout(() => tone(659, 0.15, "sine", 0.18), 80);
    setTimeout(() => tone(784, 0.2, "sine", 0.16), 160);
  },
  insanity: () => {
    tone(180, 0.3, "sawtooth", 0.18);
    setTimeout(() => tone(160, 0.3, "sawtooth", 0.15), 100);
  },
  coin: () => {
    tone(880, 0.05, "square", 0.18);
    setTimeout(() => tone(1320, 0.08, "square", 0.16), 50);
  },
  treasure: () => {
    tone(523, 0.1, "triangle", 0.2);
    setTimeout(() => tone(659, 0.1, "triangle", 0.2), 80);
    setTimeout(() => tone(784, 0.1, "triangle", 0.2), 160);
    setTimeout(() => tone(1047, 0.3, "triangle", 0.22), 240);
  },
  trap: () => {
    noiseBurst(0.3, 0.4, 2400);
    tone(120, 0.25, "sawtooth", 0.25);
  },
  rare: () => {
    tone(440, 0.4, "sine", 0.18);
    setTimeout(() => tone(554, 0.4, "sine", 0.18), 100);
    setTimeout(() => tone(659, 0.6, "sine", 0.2), 200);
  },
  death: () => {
    tone(110, 1.5, "sawtooth", 0.3);
    noiseBurst(1.2, 0.3, 600);
  },
  victory: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => tone(f, 0.25, "triangle", 0.25), i * 140)
    );
  },
  whisper: () => noiseBurst(0.5, 0.08, 400),
  metallic: () => {
    tone(2400, 0.08, "square", 0.12);
    setTimeout(() => tone(1800, 0.06, "square", 0.1), 60);
  },
};
