import { ThresholdConfig } from "../model/config.js";

/**
 * Parse and validate a threshold configuration. Refuses to load an invalid
 * configuration rather than falling back to defaults (invariant I-2,
 * SDD-MBPT-001 section 6.4). The thrown error carries every validation
 * failure so a bad file is fixed once, not field by field.
 */
export function loadConfig(candidate: unknown): ThresholdConfig {
  const result = ThresholdConfig.safeParse(candidate);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Configuration refused to load (invariant I-2 forbids defaulting): ${detail}`,
    );
  }
  return result.data;
}
