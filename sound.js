/**
 * Short synthesized tones. No audio files.
 * Call unlockAudio() from the first tap or key. play() does nothing before that.
 */

/** @typedef {"step" | "bump" | "menu" | "coin" | "hit" | "down" | "rest" | "wait" | "bell"} SoundName */

/**
 * @typedef {{ type: OscillatorType, freq: number, to?: number, dur: number, gain: number }} Tone
 */

/** @type {Record<SoundName, Tone>} */
const TONES = {
  step: { type: "triangle", freq: 520, to: 340, dur: 0.07, gain: 0.05 },
  bump: { type: "square", freq: 140, dur: 0.05, gain: 0.03 },
  menu: { type: "triangle", freq: 660, dur: 0.05, gain: 0.04 },
  coin: { type: "triangle", freq: 880, to: 1240, dur: 0.09, gain: 0.05 },
  hit: { type: "square", freq: 180, to: 90, dur: 0.08, gain: 0.04 },
  down: { type: "triangle", freq: 220, to: 70, dur: 0.22, gain: 0.06 },
  rest: { type: "triangle", freq: 196, to: 330, dur: 0.2, gain: 0.05 },
  wait: { type: "triangle", freq: 392, dur: 0.04, gain: 0.03 },
  bell: { type: "triangle", freq: 660, to: 880, dur: 0.28, gain: 0.05 },
};

/** @type {AudioContext | null} */
let ctx = null;
let unlocked = false;

function audioContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function unlockAudio() {
  const audio = audioContext();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
  unlocked = true;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ctx?.state === "suspended") {
    void ctx.resume();
  }
});

/** @param {SoundName} name */
export function play(name) {
  if (!unlocked || !ctx) return;
  const tone = TONES[name];
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tone.type;
  osc.frequency.setValueAtTime(tone.freq, now);
  if (tone.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), now + tone.dur);
  gain.gain.setValueAtTime(tone.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + tone.dur + 0.02);
}
