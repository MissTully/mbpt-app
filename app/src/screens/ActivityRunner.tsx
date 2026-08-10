// The activity runner: one state machine for all 61 activities (SDD-MBPT-001
// section 5.1). Feedback timing is enforced here, in code, once: an activity
// screen has no mechanism to show feedback during PERFORMING when the type is
// Assess (invariant I-5). And there is no code path that renders the correct
// value in response to a discrepancy (invariant I-6).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  matchExpectedResponse,
  objectiveMastery,
  selectCase,
  type ActivityDefinition,
  type ScoreResult,
  type SpokenResponse,
  type TimerEvent,
} from "@mbpt/core";
import {
  activityById,
  activityTextOf,
  caseById,
  caseLibrary,
  config,
  learnerText,
  promptsForActivity,
  PROMPT_TEXT,
  type CasePackage,
} from "../content.js";
import { GATE_SCENARIOS, type GateScenario } from "../runner/demoGates.js";
import { buildAttempt, learnerId, scaffoldStateOf, scoreAndStore, scoredHistory } from "../runner/attempt.js";
import { attemptStore } from "../adapters/store.js";
import { VideoStage, type MeasurementEvidence } from "./VideoStage.js";
import { FeedbackScreen } from "./FeedbackScreen.js";
import { ReflectScreen } from "./ReflectScreen.js";

type Phase = "preparing" | "performing" | "prompts" | "scoring" | "feedback";

function needsMeasurement(activity: ActivityDefinition): boolean {
  return activity.evidence_captured.some((e) => e === "marks" || e.startsWith("pressure_trace"));
}

export function ActivityRunner({ activityId }: { activityId: string }) {
  const activity = activityById(activityId);
  if (!activity) return <div className="card">Unknown activity.</div>;
  if (activity.type === "Present") return <PresentActivity activity={activity} />;
  if (activity.type === "Reflect") return <ReflectScreen activity={activity} />;
  return <ScoredActivity activity={activity} />;
}

function PresentActivity({ activity }: { activity: ActivityDefinition }) {
  // Teaches. No performance demanded, no scoring, no timer, no failure state.
  // Learner-facing copy from content/learner-text when authored; the
  // generated UX-spec fields remain the fallback until each is written.
  const text = activityTextOf(activity.activity_id);
  const retiredNote = learnerText.retired_activities?.[activity.activity_id];
  if (retiredNote) {
    return (
      <div>
        <Header activity={activity} />
        <div className="notice info">{retiredNote}</div>
        <button onClick={() => (location.hash = `#/lesson/${activity.lesson}`)}>Back</button>
      </div>
    );
  }
  return (
    <div>
      <Header activity={activity} />
      {text ? (
        <div className="card">
          {text.body.map((paragraph, i) => (
            <p key={i} className="prose" style={{ marginTop: i === 0 ? 0 : undefined }}>
              {paragraph}
            </p>
          ))}
          {text.demo_link && (
            <button className="secondary" onClick={() => (location.hash = "#/demo")}>
              Play the demonstration
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <p>{activity.entry_state}</p>
          <p>{activity.learner_action}</p>
          <p className="sub">{activity.system_response}</p>
        </div>
      )}
      <button onClick={() => (location.hash = `#/lesson/${activity.lesson}`)}>Done</button>
    </div>
  );
}

function caseLabel(casePkg: CasePackage | null): string {
  if (!casePkg) {
    return `${caseLibrary.length} ${caseLibrary.length === 1 ? "case" : "cases"} in the library`;
  }
  return `case ${casePkg.manifest.case_id}${casePkg.manifest.synthetic ? " (synthetic)" : ""}`;
}

function Header({ activity, casePkg = null }: { activity: ActivityDefinition; casePkg?: CasePackage | null }) {
  return (
    <div>
      <div className="topbar">
        <a href={`#/lesson/${activity.lesson}`}>← Lesson</a>
        <span className={`badge ${activity.type.toLowerCase()}`}>{activity.type}</span>
      </div>
      <h1>
        {activity.activity_id} · {activity.title}
      </h1>
      <div className="sub">
        Objectives {activity.objectives.join(", ") || "—"} · {caseLabel(casePkg)}
      </div>
    </div>
  );
}

function ScoredActivity({ activity }: { activity: ActivityDefinition }) {
  const isAssess = activity.type === "Assess";
  const scaffold = scaffoldStateOf(activity);
  const measurement = needsMeasurement(activity);
  const prompts = useMemo(() => promptsForActivity(activity), [activity]);
  const gates: GateScenario[] = useMemo(
    () =>
      activity.evidence_captured.includes("safety_gate_responses")
        ? activity.objectives.flatMap((o) => GATE_SCENARIOS[o] ?? [])
        : [],
    [activity],
  );
  const needsCircumference = activity.evidence_captured.includes("arm_circumference_entered_cm");
  const needsCuff = activity.evidence_captured.includes("cuff_selected");
  const needsRestTimer = activity.objectives.includes("A4");
  const needsPalpated = activity.objectives.some((o) => o === "C1" || o === "C2") && measurement;

  const [phase, setPhase] = useState<Phase>("preparing");
  const [palpated, setPalpated] = useState("");
  const [circEntered, setCircEntered] = useState("");
  const [circReference, setCircReference] = useState("");
  const [cuffSelected, setCuffSelected] = useState("");
  const [restTimer, setRestTimer] = useState<{ started: number } | null>(null);
  const [timerEvents, setTimerEvents] = useState<TimerEvent[]>([]);
  const [gateIndex, setGateIndex] = useState(0);
  const [gateResponses, setGateResponses] = useState<{ gate_id: string; response: string; correct: boolean }[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptDraft, setPromptDraft] = useState("");
  const [promptHinted, setPromptHinted] = useState(false);
  const [promptEcho, setPromptEcho] = useState<string | null>(null);
  const [responses, setResponses] = useState<SpokenResponse[]>([]);
  const [evidence, setEvidence] = useState<MeasurementEvidence | null>(null);
  const [casePkg, setCasePkg] = useState<CasePackage | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const startedAtIso = useRef(new Date().toISOString());
  const startedPerf = useRef(performance.now());

  async function begin() {
    // Rotation: the case least recently used for this activity (pure over
    // stored history), chosen at the moment the attempt starts.
    const history = await attemptStore.query({ learner_id: learnerId() });
    const chosen = selectCase(
      caseLibrary.map((c) => c.manifest.case_id),
      history
        .filter((h) => h.case_id !== null)
        .map((h) => ({ activity_id: h.activity_id, case_id: h.case_id!, seq: h.seq })),
      activity.activity_id,
    );
    setCasePkg(caseById(chosen));
    setPhase(gates.length > 0 || measurement ? "performing" : "prompts");
  }

  function measurementDone(measured: MeasurementEvidence) {
    setEvidence(measured);
    if (prompts.length > 0) setPhase("prompts");
    else void finish(measured, responses);
  }

  function submitPrompt() {
    const set = prompts[promptIndex]!;
    const response: SpokenResponse = {
      prompt_id: set.prompt_id,
      transcript: promptDraft,
      t_ms: Math.round(performance.now() - startedPerf.current),
      prompted: promptHinted,
      input_mode: "typed", // [DECISION-3]: structured input fallback, offline
    };
    const next = [...responses, response];
    setResponses(next);
    setPromptDraft("");
    setPromptHinted(false);
    // Practice gives immediate feedback; Assess buffers everything. This is
    // the runner's rule, not the screen's choice (invariant I-5).
    if (!isAssess) {
      const match = matchExpectedResponse(response.transcript, response.prompted, set);
      setPromptEcho(
        match.matched
          ? "That names what it needed to name."
          : "That answer did not name everything required. It is recorded; try phrasing what you would actually do.",
      );
    }
    if (promptIndex + 1 < prompts.length) setPromptIndex(promptIndex + 1);
    else void finish(evidence, next);
  }

  async function finish(measured: MeasurementEvidence | null, finalResponses: SpokenResponse[]) {
    setPhase("scoring");
    const withPalpated: SpokenResponse[] =
      needsPalpated && palpated !== ""
        ? [
            {
              prompt_id: "C1_palpated_estimate",
              transcript: palpated,
              t_ms: 0,
              prompted: false,
              input_mode: "structured",
            },
            ...finalResponses,
          ]
        : finalResponses;
    const record = buildAttempt({
      activity,
      startedAtIso: startedAtIso.current,
      seq: await nextSeq(),
      samples: measured?.samples ?? [],
      marks: measured?.marks ?? [],
      tracking_gaps: measured?.tracking_gaps ?? [],
      spoken_responses: withPalpated,
      safety_gate_responses: gateResponses,
      timer_events: timerEvents,
      steps_completed: [],
      equipment_check: null, // no runtime equipment loop in video mode (ADR-007)
      audio_route: "unknown",
      perception_mode: "video",
      calibration: null,
      learner_selection: null,
      arm_circumference_entered_cm: circEntered === "" ? null : Number(circEntered),
      arm_circumference_reference_cm: circReference === "" ? null : Number(circReference),
      cuff_selected: cuffSelected === "" ? null : cuffSelected,
      case_id: (casePkg ?? caseLibrary[0]!).manifest.case_id,
      case_version: (casePkg ?? caseLibrary[0]!).manifest.case_version,
    });
    const scoreResult = await scoreAndStore(record);
    const history = await scoredHistory();
    const streakNow: Record<string, number> = {};
    for (const objective of record.objectives) {
      streakNow[objective] = objectiveMastery(objective, history, config).streak;
    }
    setStreaks(streakNow);
    setResult(scoreResult);
    setPhase("feedback");
  }

  async function nextSeq(): Promise<number> {
    return attemptStore.nextSeq();
  }

  if (phase === "feedback" && result) {
    return (
      <div>
        <Header activity={activity} casePkg={casePkg} />
        <FeedbackScreen
          activity={activity}
          result={result}
          streaks={streaks}
          marks={evidence?.marks ?? []}
          groundTruth={(casePkg ?? caseLibrary[0]!).manifest.ground_truth}
        />
      </div>
    );
  }

  if (phase === "scoring") {
    return (
      <div>
        <Header activity={activity} />
        <div className="card">Sealing the attempt record and scoring…</div>
      </div>
    );
  }

  if (phase === "performing" && gates.length > 0 && gateIndex < gates.length) {
    const gate = gates[gateIndex]!;
    return (
      <div>
        <Header activity={activity} />
        <div className="card">
          <p>{gate.prompt}</p>
          {gate.options.map((option) => (
            <button
              key={option.value}
              className="secondary"
              style={{ display: "block", width: "100%", marginTop: 8 }}
              onClick={() => {
                setGateResponses([
                  ...gateResponses,
                  { gate_id: gate.gate_id, response: option.value, correct: option.correct },
                ]);
                if (gateIndex + 1 < gates.length) setGateIndex(gateIndex + 1);
                else if (measurement) setGateIndex(gates.length);
                else if (prompts.length > 0) setPhase("prompts");
                else
                  void finish(null, responses); // gates were the whole activity
              }}
            >
              {option.label}
            </button>
          ))}
          {!isAssess && gateIndex > 0 && (
            <p className="sub" style={{ marginTop: 10 }}>
              {gateResponses[gateResponses.length - 1]?.correct
                ? "Correct."
                : "That decision was not correct. A contraindicated limb is never used carefully."}
            </p>
          )}
        </div>
        <div className="sub">
          Scenario {gateIndex + 1} of {gates.length} · demo scenarios pending the authored library
        </div>
      </div>
    );
  }

  if (phase === "performing" && measurement) {
    return (
      <div>
        <Header activity={activity} casePkg={casePkg} />
        <VideoStage
          casePkg={casePkg ?? caseLibrary[0]!}
          scaffold={scaffold}
          countsTowardMastery={isAssess && scaffold === "unaided"}
          onDone={measurementDone}
        />
      </div>
    );
  }

  if (phase === "prompts") {
    const set = prompts[promptIndex];
    if (!set) {
      void finish(evidence, responses);
      return null;
    }
    return (
      <div>
        <Header activity={activity} />
        {promptEcho && !isAssess && <div className="notice info">{promptEcho}</div>}
        <div className="card">
          <p>{PROMPT_TEXT[set.prompt_id] ?? set.prompt_id}</p>
          <label htmlFor="prompt-input">Your answer — say it as you would at the bedside, then type it</label>
          <textarea
            id="prompt-input"
            rows={3}
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
          />
          <div className="row spread" style={{ marginTop: 10 }}>
            <button className="quiet" onClick={() => setPromptHinted(true)} disabled={promptHinted}>
              {promptHinted ? "Prompted — recorded as such" : "I need a prompt"}
            </button>
            <button onClick={submitPrompt} disabled={promptDraft.trim() === ""}>
              Commit answer
            </button>
          </div>
        </div>
        <div className="sub">
          Question {promptIndex + 1} of {prompts.length}
          {isAssess ? " · feedback is held until the attempt ends" : ""}
        </div>
      </div>
    );
  }

  // PREPARING. What the learner reads is authored copy when it exists, and
  // otherwise an instruction derived from what the activity actually does —
  // never the generated UX-spec fields, which describe surfaces that may
  // not be this one (ADR-007).
  const authored = activityTextOf(activity.activity_id);
  const willDo = [
    gates.length > 0 && "decide what to do in short bedside scenarios",
    measurement && "watch and listen to a recorded measurement, marking systolic and diastolic as you hear them",
    prompts.length > 0 && "answer, in your own words, the questions you would answer at the bedside",
  ].filter(Boolean);
  const canBegin = !needsPalpated || palpated !== "";
  return (
    <div>
      <Header activity={activity} />
      <div className="card">
        {authored ? (
          authored.body.map((paragraph, i) => (
            <p key={i} className="prose" style={{ marginTop: i === 0 ? 0 : undefined }}>
              {paragraph}
            </p>
          ))
        ) : willDo.length > 0 ? (
          <p>In this activity you will {willDo.join(", then ")}.</p>
        ) : (
          // Hands-on evidence the phone cannot observe in this release: the
          // learner still performs the step for real; the record says so.
          <p>
            Perform this step for real, with your own equipment, taking your time. The app records
            the attempt but cannot observe your hands in this release, so its findings are marked
            not assessable rather than guessed.
          </p>
        )}
      </div>

      {measurement && (
        <div className="notice info">
          This activity plays a recorded measurement. Headphones on; you will mark the
          sounds as they happen.
        </div>
      )}

      {needsPalpated && (
        <div className="card">
          <label htmlFor="palpated">{PROMPT_TEXT["C1_palpated_estimate"]}</label>
          <input
            id="palpated"
            type="number"
            inputMode="numeric"
            value={palpated}
            onChange={(e) => setPalpated(e.target.value)}
          />
        </div>
      )}

      {needsCircumference && (
        <div className="card">
          <label htmlFor="circ-entered">Arm circumference you measured (cm)</label>
          <input id="circ-entered" type="number" value={circEntered} onChange={(e) => setCircEntered(e.target.value)} />
          <label htmlFor="circ-ref">Reference circumference from your partner (cm)</label>
          <input id="circ-ref" type="number" value={circReference} onChange={(e) => setCircReference(e.target.value)} />
        </div>
      )}

      {needsCuff && (
        <div className="card">
          <label htmlFor="cuff">Cuff selected</label>
          <select id="cuff" value={cuffSelected} onChange={(e) => setCuffSelected(e.target.value)}>
            <option value="">choose…</option>
            <option value="small_adult">small adult</option>
            <option value="adult">adult</option>
            <option value="large_adult">large adult</option>
            <option value="extra_large">extra large</option>
          </select>
          {config.cuff_bladder_fit_standard === null && (
            <p className="sub">
              Cuff selection is recorded but cannot be scored until the bladder fit standard is
              confirmed in writing (open decision, INSTR 11.2).
            </p>
          )}
        </div>
      )}

      {needsRestTimer && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quiet rest</h2>
          {restTimer === null ? (
            <button className="secondary" onClick={() => setRestTimer({ started: performance.now() })}>
              Start rest timer
            </button>
          ) : (
            <RestTimer
              startedAt={restTimer.started}
              required_s={config.rest_duration_s}
              onStop={(started_ms, ended_ms) => {
                setTimerEvents([...timerEvents, { timer_id: "rest", started_ms, ended_ms }]);
                setRestTimer(null);
              }}
            />
          )}
          {timerEvents.length > 0 && (
            <p className="sub">rest recorded: {Math.round((timerEvents[0]!.ended_ms - timerEvents[0]!.started_ms) / 1000)} s</p>
          )}
        </div>
      )}

      <button onClick={begin} disabled={!canBegin} style={{ width: "100%", marginTop: 8 }}>
        {isAssess ? "Begin — this one counts" : "Begin practice"}
      </button>
    </div>
  );
}

function RestTimer({
  startedAt,
  required_s,
  onStop,
}: {
  startedAt: number;
  required_s: number;
  onStop(started_ms: number, ended_ms: number): void;
}) {
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const elapsed = Math.round((now - startedAt) / 1000);
  return (
    <div className="row spread">
      <span className="pressure-readout" style={{ fontSize: "1.4rem" }}>
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / {Math.floor(required_s / 60)}:00
      </span>
      <button className="secondary" onClick={() => onStop(0, elapsed * 1000)}>
        End rest
      </button>
    </div>
  );
}

