// The needle estimator worker: perception runs off the main thread (driver
// D3). Receives grayscale frames, returns readings. A dropped frame is
// acceptable; a stalled interface during a live measurement is not.

import { NeedleEstimator, type DialGeometry } from "@mbpt/perception";
import type { Calibration } from "@mbpt/core";

let estimator: NeedleEstimator | null = null;

interface InitMessage {
  kind: "init";
  geometry: DialGeometry;
  calibration: Calibration | null;
}
interface FrameMessage {
  kind: "frame";
  t_ms: number;
  width: number;
  height: number;
  gray: Uint8Array; // transferred
}
interface CalibrateMessage {
  kind: "calibrate";
  calibration: Calibration;
}

self.onmessage = (event: MessageEvent<InitMessage | FrameMessage | CalibrateMessage>) => {
  const message = event.data;
  if (message.kind === "init") {
    estimator = new NeedleEstimator(message.geometry, message.calibration);
  } else if (message.kind === "calibrate") {
    estimator?.setCalibration(message.calibration);
  } else if (message.kind === "frame" && estimator) {
    const reading = estimator.step(
      { width: message.width, height: message.height, data: message.gray },
      message.t_ms,
    );
    (self as unknown as Worker).postMessage({ kind: "reading", reading });
  }
};
