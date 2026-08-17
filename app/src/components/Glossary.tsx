import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseTermMarkup, type GlossaryEntry } from "@mbpt/core";
import { instruction } from "../content.js";

// Medical words, made tappable.
//
// The rule this file exists to keep: a learner never has to leave the
// sentence to understand it. Every clinical word in the instructional
// content is written as [[term]] markup, rendered as a highlighted word, and
// opens its plain-language definition in place. Reading is not interrupted —
// closing the definition puts the learner back on the same line.
//
// The definition sheet is a bottom sheet rather than a floating bubble
// because the release is phone-only: a bubble anchored to a word at the top
// of a paragraph has nowhere to go on a 360-pixel screen, and a learner
// holding a cuff in one hand should not have to aim.

interface GlossaryContextValue {
  open(term_id: string): void;
}

const GlossaryContext = createContext<GlossaryContextValue>({ open: () => {} });

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const open = useCallback((term_id: string) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    setOpenId(term_id);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    returnFocusTo.current?.focus();
  }, []);

  const value = useMemo(() => ({ open }), [open]);
  const entry = openId === null ? null : instruction.termOf(openId);

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      {entry && <DefinitionSheet entry={entry} onClose={close} />}
    </GlossaryContext.Provider>
  );
}

/** A highlighted word. Tapping it opens the definition; it is a real button,
 * so it is reachable by keyboard and announced by a screen reader. */
export function Term({ term_id, children }: { term_id: string; children: React.ReactNode }) {
  const { open } = useContext(GlossaryContext);
  const entry = instruction.termOf(term_id);
  if (!entry) return <>{children}</>;
  return (
    <button
      type="button"
      className="term"
      aria-haspopup="dialog"
      aria-label={`${entry.term} — tap for the definition`}
      onClick={() => open(term_id)}
    >
      {children}
    </button>
  );
}

/** Learner text with its [[term]] markup rendered. Every string that reaches
 * a learner goes through here, so a word is never highlighted on one screen
 * and plain on another. */
export function RichText({ text }: { text: string }) {
  const spans = useMemo(() => parseTermMarkup(text), [text]);
  return (
    <>
      {spans.map((span, i) =>
        span.kind === "text" ? (
          <span key={i}>{span.text}</span>
        ) : (
          <Term key={i} term_id={span.term_id}>
            {span.text}
          </Term>
        ),
      )}
    </>
  );
}

function DefinitionSheet({ entry, onClose }: { entry: GlossaryEntry; onClose(): void }) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheet.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-term"
        tabIndex={-1}
        ref={sheet}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="row spread">
          <h2 id="definition-term" className="definition-term">
            {entry.term}
          </h2>
          <span className="badge">definition</span>
        </div>
        {entry.say_it && <p className="definition-say">say it: {entry.say_it}</p>}
        <p className="definition-plain">{entry.plain}</p>
        {entry.also_called && (
          <p className="definition-also">
            <strong>Also called:</strong> {entry.also_called}
          </p>
        )}
        {entry.matters && (
          <div className="definition-matters">
            <strong>Why it matters</strong>
            <p>{entry.matters}</p>
          </div>
        )}
        <button className="secondary" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>
          Back to the lesson
        </button>
        <div className="sub" style={{ textAlign: "center", margin: "10px 0 0" }}>
          <a href="#/glossary" onClick={onClose}>
            See every word →
          </a>
        </div>
      </div>
    </div>
  );
}
