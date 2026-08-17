import { useMemo, useState } from "react";
import { instruction } from "../content.js";

// The whole glossary in one place. The tappable word inside a lesson is the
// main way a learner meets a definition; this screen is for the other way —
// a word heard on a shift, half remembered, looked up on the bus.

export function GlossaryScreen() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (needle === "") return instruction.glossary;
    return instruction.glossary.filter((entry) =>
      [entry.term, entry.plain, entry.also_called ?? "", entry.say_it ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [needle]);

  return (
    <div>
      <div className="topbar">
        <a href="#/modules">← Modules</a>
        <span className="badge">{instruction.glossary.length} words</span>
      </div>
      <h1>Words on the ward</h1>
      <div className="sub">
        Every medical word this course uses, in plain language. Inside a lesson, tap any{" "}
        <span className="term-sample">highlighted word</span> to see the same definition without losing
        your place.
      </div>

      <label htmlFor="glossary-search">Search</label>
      <input
        id="glossary-search"
        type="text"
        value={query}
        placeholder="systolic, cuff, fistula…"
        onChange={(event) => setQuery(event.target.value)}
      />

      {matches.length === 0 && (
        <div className="card">
          <p className="prose" style={{ margin: 0 }}>
            No word matches “{query}”. Try a shorter search, or the plain-language version — the
            glossary is written to be found by the word you already know.
          </p>
        </div>
      )}

      {matches.map((entry) => (
        <div key={entry.term_id} className="card glossary-entry">
          <div className="row spread">
            <strong className="definition-term">{entry.term}</strong>
            {entry.say_it && <span className="badge">{entry.say_it}</span>}
          </div>
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
        </div>
      ))}
    </div>
  );
}
