// Case rotation: which recorded case an attempt should play. Pure over the
// stored history, like everything else that matters. Rotation is what lets
// the terminal mastery rule ("at least two clinical cases in the streak")
// ever be satisfiable, and it keeps a learner from memorising one recording's
// values instead of learning to hear.

export interface CaseUse {
  activity_id: string;
  case_id: string;
  seq: number;
}

/** Choose from the playable case ids: the case least recently used for this
 * activity; ties fall to fewest total uses, then lexicographic order, so the
 * choice is deterministic from history alone. */
export function selectCase(
  candidates: readonly string[],
  history: readonly CaseUse[],
  activity_id: string,
): string {
  if (candidates.length === 0) throw new Error("selectCase: no playable cases");
  const forActivity = history.filter((h) => h.activity_id === activity_id);
  const lastUsed = new Map<string, number>();
  const uses = new Map<string, number>();
  for (const use of forActivity) {
    lastUsed.set(use.case_id, Math.max(lastUsed.get(use.case_id) ?? -1, use.seq));
    uses.set(use.case_id, (uses.get(use.case_id) ?? 0) + 1);
  }
  return [...candidates].sort((a, b) => {
    const byRecency = (lastUsed.get(a) ?? -1) - (lastUsed.get(b) ?? -1);
    if (byRecency !== 0) return byRecency;
    const byUses = (uses.get(a) ?? 0) - (uses.get(b) ?? 0);
    if (byUses !== 0) return byUses;
    return a < b ? -1 : 1;
  })[0]!;
}
