// Demo safety-gate scenarios. DEMO CONTENT: the real scenario library is the
// learning engineer's deliverable; these exist so the gate machinery is
// exercisable today. Gate ids follow the "<objective>:<gate>" convention the
// scorer matches on.

export interface GateScenario {
  gate_id: string;
  prompt: string;
  options: { value: string; label: string; correct: boolean }[];
}

export const GATE_SCENARIOS: Record<string, GateScenario[]> = {
  A1: [
    {
      gate_id: "A1:left_fistula",
      prompt: "The patient has an arteriovenous fistula in the left arm. Where do you measure?",
      options: [
        { value: "left_carefully", label: "Left arm, carefully", correct: false },
        { value: "right_arm", label: "Right arm", correct: true },
        { value: "either", label: "Either arm", correct: false },
      ],
    },
    {
      gate_id: "A1:right_iv_line",
      prompt: "There is an intravenous line in the right arm and nothing notable on the left.",
      options: [
        { value: "left_arm", label: "Left arm", correct: true },
        { value: "right_above_iv", label: "Right arm, above the line", correct: false },
      ],
    },
    {
      gate_id: "A1:bilateral_issue",
      prompt: "Left arm: lymphoedema after axillary dissection. Right arm: fresh injury. What now?",
      options: [
        { value: "least_bad_arm", label: "Use the less affected arm", correct: false },
        { value: "escalate", label: "Escalate before measuring", correct: true },
      ],
    },
    {
      gate_id: "A1:no_issue",
      prompt: "No contraindication on either limb. What do you do?",
      options: [
        { value: "proceed", label: "Proceed with either arm", correct: true },
        { value: "escalate_anyway", label: "Escalate to be safe", correct: false },
      ],
    },
  ],
  A5: [
    {
      gate_id: "A5:just_exercised",
      prompt: "The patient jogged up three flights of stairs a minute ago.",
      options: [
        { value: "measure_now", label: "Measure now", correct: false },
        { value: "wait_rest", label: "Wait out the rest period, then measure", correct: true },
      ],
    },
    {
      gate_id: "A5:talking",
      prompt: "The patient wants to chat during the measurement.",
      options: [
        { value: "chat_ok", label: "Talking does not affect the reading", correct: false },
        { value: "quiet", label: "Ask for quiet during the measurement", correct: true },
      ],
    },
  ],
  B6: [
    {
      gate_id: "B6:no_fit",
      prompt: "The largest cuff available is too small for this arm. What do you do?",
      options: [
        { value: "use_largest", label: "Use the largest cuff and note it", correct: false },
        { value: "state_alternative", label: "State the correct alternative rather than proceeding", correct: true },
      ],
    },
  ],
};
