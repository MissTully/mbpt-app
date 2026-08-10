// The browser camera gauge adapter: standard media capture, frames pushed to
// the estimator worker, readings emitted through the GaugeReader port.
// Confidence thresholding happens HERE, in the adapter (invariant I-9): below
// threshold the pressure is reported as unavailable, never as a value.

import type { Calibration } from "@mbpt/core";
import { rgbaToGray, type DialGeometry, type EstimatorReading, type GaugeReading } from "@mbpt/perception";

export class CameraGaugeReader {
  private worker: Worker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private raf = 0;
  private handler: ((r: GaugeReading) => void) | null = null;
  private busy = false;
  private lastRaw: EstimatorReading | null = null;

  constructor(
    private geometry: DialGeometry,
    private confidenceThreshold: number,
  ) {}

  onReading(handler: (r: GaugeReading) => void): void {
    this.handler = handler;
  }

  /** The preview element, for the framing view. Valid after start(). */
  videoElement(): HTMLVideoElement | null {
    return this.video;
  }

  async startCamera(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
    });
    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();
  }

  start(calibration: Calibration | null): void {
    if (!this.video) throw new Error("startCamera() before start()");
    this.worker = new Worker(new URL("./gaugeWorker.ts", import.meta.url), { type: "module" });
    this.worker.postMessage({ kind: "init", geometry: this.geometry, calibration });
    this.worker.onmessage = (event: MessageEvent<{ kind: string; reading: EstimatorReading }>) => {
      this.busy = false;
      if (event.data.kind !== "reading") return;
      const reading = event.data.reading;
      this.lastRaw = reading;
      const usable = reading.confidence >= this.confidenceThreshold;
      this.handler?.({
        t_ms: reading.t_ms,
        // Invariant I-9: a wrong pressure is worse than none.
        pressure_mmhg: usable ? reading.pressure_mmhg : null,
        confidence: reading.confidence,
      });
    };

    const side = 240;
    this.canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(side, side)
        : Object.assign(document.createElement("canvas"), { width: side, height: side });
    const context = this.canvas.getContext("2d", { willReadFrequently: true }) as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;

    const pump = () => {
      if (this.video && this.worker && !this.busy && this.video.readyState >= 2) {
        // Crop the central square of the preview — the framing guide puts the
        // dial there — and downscale to the analysis size.
        const vw = this.video.videoWidth;
        const vh = this.video.videoHeight;
        const square = Math.min(vw, vh);
        context.drawImage(this.video, (vw - square) / 2, (vh - square) / 2, square, square, 0, 0, side, side);
        const rgba = context.getImageData(0, 0, side, side);
        const gray = rgbaToGray(rgba.data, side, side);
        this.busy = true;
        this.worker.postMessage(
          { kind: "frame", t_ms: performance.now(), width: side, height: side, gray: gray.data },
          [gray.data.buffer as ArrayBuffer],
        );
      }
      this.raf = requestAnimationFrame(pump);
    };
    this.raf = requestAnimationFrame(pump);
  }

  calibrate(calibration: Calibration): void {
    this.worker?.postMessage({ kind: "calibrate", calibration });
  }

  /** Raw needle angle for the calibration flow (zero capture). */
  lastAngle(): { angle_deg: number; confidence: number } | null {
    return this.lastRaw
      ? { angle_deg: this.lastRaw.angle_deg, confidence: this.lastRaw.confidence }
      : null;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.worker?.terminate();
    this.worker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video = null;
  }
}

/** The analysis-frame geometry: the framing guide centres the dial in the
 * cropped square, so the dial circle is known without detection. */
export function defaultGeometry(): DialGeometry {
  return { cx: 120, cy: 120, radius: 108 };
}
