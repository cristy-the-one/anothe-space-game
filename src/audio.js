let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone({ freq = 440, type = 'square', duration = 0.1, gain = 0.3, freqEnd = null, detune = 0 }) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + duration);
  osc.detune.setValueAtTime(detune, c.currentTime);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function playNoise(duration = 0.1, gain = 0.2, freqLow = 100, freqHigh = 2000) {
  const c = getCtx();
  const bufSize = c.sampleRate * duration;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (freqLow + freqHigh) / 2;
  filter.Q.value = 0.5;
  const g = c.createGain();
  src.connect(filter); filter.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.start(); src.stop(c.currentTime + duration);
}

export const audio = {
  shoot()         { playTone({ freq: 880, type: 'square', duration: 0.06, gain: 0.15 }); },
  explodeSmall()  { playNoise(0.12, 0.25, 200, 1800); },
  explodeLarge()  { playNoise(0.4,  0.4,  60,  800); },
  powerUp()       {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'square', duration: 0.08, gain: 0.2 }), i * 60));
  },
  playerHit()     { playTone({ freq: 220, freqEnd: 80, type: 'sawtooth', duration: 0.3, gain: 0.3 }); },
  bossPhase()     {
    [110, 138, 164].forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: 'sawtooth', duration: 0.4, gain: 0.35 }), i * 100));
  },
};
