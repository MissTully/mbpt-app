# Threshold configuration changelog

Invariant I-2: changing a tolerance is a data change with a version number and
a changelog entry, never a code edit. Every retired version stays readable
forever, or old attempts cannot be re-scored.

## cfg-1.0.0 — 2026-08-10

Initial version, transcribed from INSTR-MBPT-001 section 9.

- `cuff_bladder_fit_standard` is **explicitly unset** (INSTR section 11.2,
  DECISION REQUIRED, owner Nisha Patel with the partner institution, in
  writing). Objective B2 scores `not_assessable` until it is set.
- `circumference_agreement_cm` = 1.5, the provisional reading of the INSTR
  section 11.3 mismatch confirmed by Melissa Tully on 2026-08-10 (see
  docs/decisions/DECISION-LOG.md). The objective text still says 1 cm; the
  workbook update is pending.
- `needle_confidence_threshold` = 0.6 **provisional** — to be set from
  milestone M1 evidence via the needle laboratory, and recorded in ADR-002.
  The provisional flag is itself a config field so reports can say so.
- `terminal_digit_bias_threshold` and `rest_duration_s` are engineer-proposed
  additions (INSTR section 9 omits them; invariant I-2 forbids holding either
  threshold in code). Raised in the decision log for adoption under INSTR
  section 10.2.
