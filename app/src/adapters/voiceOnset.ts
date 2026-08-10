// Voice onset detection: the mark timestamp. A cheap energy detector on the
// microphone stream, firing within a few milliseconds of the learner
// beginning to speak. The timestamp is taken at ONSET, never at recognition
// (INSTR-MBPT-001 section 6.3 point 4) — recogniser latency must never enter
// a score.

export class VoiceOnsetDetector {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private baseline = 0;
  private armed = true;
  private handler: ((t_ms: number) => void) | null = null;

  onOnset(handler: (t_ms: number) => void): void {
    this.handler = handler;
  }

  /** Requests microphone permission. A refusal propagates to the caller: per
   * [DECISION-7] marking activities are blocked with a clear explanation, not
   * silently degraded. */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext();
    await this.context.resume();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    source.connect(this.analyser);
    const data = new Float32Array(this.analyser.fftSize);
    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
      const rms = Math.sqrt(sum / data.length);
      // Adaptive baseline tracks room noise; an onset is a sharp departure
      // from it. Requiring 4x baseline plus an absolute floor keeps a partner
      // two metres away from marking for the learner — an honest limitation
      // recorded in the perception capability report.
      this.baseline = this.baseline * 0.995 + rms * 0.005;
      const threshold = Math.max(0.02, this.baseline * 4);
      if (this.armed && rms > threshold) {
        this.armed = false;
        this.handler?.(performance.now());
        setTimeout(() => (this.armed = true), 700); // refractory period
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.context?.close();
    this.context = null;
    this.stream = null;
    this.analyser = null;
  }
}
