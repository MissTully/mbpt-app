// The browser audio adapter. Individual beats held as decoded buffers,
// scheduled ahead of time against the audio hardware clock — never triggered
// on demand (ARC-MBPT-001 section 4.5, ADR-005). For the synthetic demo case
// the beats are software-rendered once at startup and labelled synthetic.

import type { AudioRoute, BeatCharacter } from "@mbpt/core";

const LOOKAHEAD_MS = 40; // deliberate spend from the synchrony budget

function renderBeat(context: BaseAudioContext, character: BeatCharacter): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = character === "phase2_swishing" ? 0.14 : 0.1;
  const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  // A Korotkoff-like thump: low-frequency damped burst. Character varies the
  // envelope and noise mix. Deterministic (seeded noise) so every learner
  // hears the same synthetic beat.
  let seed = 12345;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * (character === "phase4_muffled" ? 70 : 45));
    const tone =
      Math.sin(2 * Math.PI * (character === "phase1_crisp" ? 95 : 65) * t) *
      (character === "phase2_swishing" ? 0.5 : 1);
    const hiss = character === "phase2_swishing" ? noise() * 0.35 : noise() * 0.08;
    const gain = character === "phase4_muffled" ? 0.5 : 0.9;
    data[i] = (tone + hiss) * decay * gain;
  }
  return buffer;
}

export class WebAudioOutput {
  private context: AudioContext | null = null;
  private buffers = new Map<BeatCharacter, AudioBuffer>();
  private originMs = 0; // performance.now() at context start

  async start(): Promise<void> {
    if (this.context) return;
    this.context = new AudioContext();
    await this.context.resume();
    this.originMs = performance.now() - this.context.currentTime * 1000;
    for (const character of ["phase1_crisp", "phase2_swishing", "phase4_muffled"] as const) {
      this.buffers.set(character, renderBeat(this.context, character));
    }
  }

  /** Schedule a beat at a performance.now()-domain timestamp plus lookahead. */
  scheduleBeat(_beatId: string, atMs: number, character: string): void {
    if (!this.context) return;
    const buffer = this.buffers.get(character as BeatCharacter);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const contextTime = (atMs - this.originMs) / 1000 + LOOKAHEAD_MS / 1000;
    source.start(Math.max(this.context.currentTime, contextTime));
  }

  playSample(character: BeatCharacter = "phase1_crisp"): void {
    this.scheduleBeat("sample", performance.now(), character);
  }

  /** Best-effort route detection. Browsers expose little here; unknown is
   * reported honestly rather than guessed (SDD section 4.5: detect, record,
   * warn — refusal to score is configurable policy). */
  currentRoute(): AudioRoute {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.enumerateDevices) return "unknown";
    // enumerateDevices is async; the session polls detectRoute() instead.
    return this.lastRoute;
  }

  private lastRoute: AudioRoute = "unknown";

  async detectRoute(): Promise<AudioRoute> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      const label = outputs.map((d) => d.label.toLowerCase()).join(" ");
      if (/bluetooth|airpods|buds|wireless/.test(label)) this.lastRoute = "bluetooth";
      else if (/headphone|headset|wired|earphone/.test(label)) this.lastRoute = "wired";
      else if (outputs.length > 0 && label.length > 0) this.lastRoute = "speaker";
      else this.lastRoute = "unknown";
    } catch {
      this.lastRoute = "unknown";
    }
    return this.lastRoute;
  }

  outputLatencyMs(): number {
    if (!this.context) return 0;
    const latency = (this.context.outputLatency ?? this.context.baseLatency ?? 0) * 1000;
    return Math.round(latency + LOOKAHEAD_MS);
  }

  async stop(): Promise<void> {
    await this.context?.close();
    this.context = null;
  }
}
