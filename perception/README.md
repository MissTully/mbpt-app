# perception

Interfaces declared here, implementations per platform (INSTR-MBPT-001
section 6.8). Nothing above this layer knows how a pressure value was
obtained.

- `src/ports.ts` — the contracts the core-side consumers depend on:
  GaugeReader, VoiceInput, AudioOutput, SpatialTracker (declared, unimplemented,
  release 2), AttemptStore.
- `src/gauge/` — the needle estimator: pure pixel arithmetic, no browser or
  device imports. The browser camera adapter that feeds it frames lives in
  `/app`, above the boundary; the needle laboratory that validates it lives in
  `/tools/needle-lab`.
- `src/paced/` — the authored deflation ramp behind the paced shadowing
  adapter, the designed fallback for risk R2.

This package is inside the boundary check: no browser, camera, audio or
device import may appear here. Platform adapters live in `/app`.
