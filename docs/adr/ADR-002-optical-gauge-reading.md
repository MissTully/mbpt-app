# ADR-002: Optical gauge reading

**Status:** open — completes at milestone M1 · **Date:** opened 2026-08-10

## Context
The closed loop needs the real dial read at 30-60 frames per second. Pressure
accuracy is not the binding constraint; perceived audiovisual synchrony is
(about 120 ms end to end): 100 ms of latency is ~0.25 mmHg at a correct
deflation rate, an order of magnitude inside the 4 mmHg tolerance.

## Decision (provisional)
Classical computer vision, hand written, in a worker: radial sampling around
the dial centre, angular peak with sub-bin centroid, unwrapping, alpha-beta
filtering, two-point linear calibration, confidence with a physical meaning.
No CV library until the hand-written version misses the M1 target.

## To be completed at M1, from needle-lab evidence
- The measured error distribution (median, p95, p99, max) across three gauge
  models and three lighting conditions.
- The chosen `needle_confidence_threshold` (currently 0.6 **provisional** in
  cfg-1.0.0).
- The answer to [DECISION-2], dial linearity: does the two-point linear map
  hold across the full range, or is a third point or correction curve needed?

## Alternatives considered
A trained model: needs a labelled corpus that does not exist, fails
confidently (the worst behaviour under invariant I-9), and costs weeks.
Remains the fallback if M1 fails; the port boundary makes the swap contained.
