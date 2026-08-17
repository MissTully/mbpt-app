import { useState } from "react";
import type { InstructionBlock, InstructionPage } from "@mbpt/core";
import { instruction } from "../content.js";
import { RichText, Term } from "./Glossary.js";

// The teaching layer: what a learner reads before they do anything.
//
// Every block type here answers a question the workbook answered on paper —
// what are the steps, what does this word mean, what happens if I get it
// wrong, how do I practise this alone tonight — and each one is a distinct
// shape on screen, because a learner scanning a lesson for the third time is
// looking for a shape, not a paragraph.
//
// Two rules hold across all of them. Learner text is rendered through
// RichText, so a clinical word is tappable everywhere it appears. And
// knowledge checks are teaching, not assessment: nothing on this screen is
// recorded, scored, or counted toward mastery (invariant I-5 — only attempts
// are scored, and a lesson page is not an attempt).

export function InstructionPageView({ page }: { page: InstructionPage }) {
  return (
    <div className="instruction">
      <p className="lesson-headline">
        <RichText text={page.headline} />
      </p>
      <div className="card outcomes">
        <div className="row spread">
          <strong>After this you can</strong>
          <span className="badge">{page.read_minutes} min read</span>
        </div>
        <ul className="outcome-list">
          {page.you_will.map((outcome, i) => (
            <li key={i}>
              <RichText text={outcome} />
            </li>
          ))}
        </ul>
      </div>
      <Blocks blocks={page.blocks} />
    </div>
  );
}

export function Blocks({ blocks }: { blocks: InstructionBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </>
  );
}

function Block({ block }: { block: InstructionBlock }) {
  switch (block.kind) {
    case "prose":
      return (
        <p className="prose">
          <RichText text={block.text} />
        </p>
      );

    case "heading":
      return (
        <h2>
          <RichText text={block.text} />
        </h2>
      );

    case "list":
      return <ListBlock block={block} />;

    case "steps":
      return (
        <div className="steps">
          {block.title && <h3 className="block-title">{block.title}</h3>}
          {block.items.map((item, i) => (
            <div key={i} className="card step">
              <div className="step-num" aria-hidden="true">
                {i + 1}
              </div>
              <div>
                <div className="step-do">
                  <RichText text={item.do} />
                </div>
                {item.why && (
                  <p className="step-why">
                    <span className="why-label">Why:</span> <RichText text={item.why} />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      );

    case "callout":
      return (
        <div className={`callout ${block.variant}`}>
          <div className="callout-head">
            <span className="callout-icon" aria-hidden="true">
              {CALLOUT_ICON[block.variant]}
            </span>
            <strong>{block.title}</strong>
          </div>
          <p>
            <RichText text={block.text} />
          </p>
        </div>
      );

    case "table":
      return (
        <div className="table-block">
          {block.title && <h3 className="block-title">{block.title}</h3>}
          {block.caption && <p className="table-caption">{block.caption}</p>}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {block.headers.map((header, i) => (
                    <th key={i}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className={j === 0 ? "cell-key" : undefined}>
                        <RichText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note && <p className="table-note">{block.note}</p>}
        </div>
      );

    case "keyterms":
      return (
        <div className="keyterms">
          <div className="keyterms-label">{block.title ?? "Key words"}</div>
          <div className="row">
            {block.terms.map((term_id) => {
              const entry = instruction.termOf(term_id);
              return (
                <Term key={term_id} term_id={term_id}>
                  {entry?.term ?? term_id}
                </Term>
              );
            })}
          </div>
        </div>
      );

    case "check":
      return <CheckBlock block={block} />;

    case "practice":
      return (
        <div className="card practice">
          <div className="row spread">
            <strong>{block.title}</strong>
            <span className="badge">practice</span>
          </div>
          <PracticeMove label="I do" body={block.i_do} />
          <PracticeMove label="We do" body={block.we_do} />
          <PracticeMove label="You do" body={block.you_do} />
          {block.say_aloud.length > 0 && (
            <div className="say-aloud">
              <div className="say-aloud-label">Say it out loud</div>
              {block.say_aloud.map((line, i) => (
                <p key={i} className="say-aloud-line">
                  “<RichText text={line} />”
                </p>
              ))}
            </div>
          )}
        </div>
      );

    case "video":
      return <VideoBlock video_id={block.video_id} note={block.note} />;
  }
}

const CALLOUT_ICON: Record<string, string> = {
  linchpin: "◆",
  safety: "!",
  tip: "★",
  scope: "§",
  myth: "✕",
};

function ListBlock({ block }: { block: Extract<InstructionBlock, { kind: "list" }> }) {
  const items = block.items.map((item, i) => (
    <li key={i}>
      <RichText text={item} />
    </li>
  ));
  return (
    <div className="list-block">
      {block.title && <h3 className="block-title">{block.title}</h3>}
      {block.style === "numbered" ? (
        <ol className="teaching-list numbered">{items}</ol>
      ) : (
        <ul className={`teaching-list ${block.style}`}>{items}</ul>
      )}
    </div>
  );
}

function PracticeMove({ label, body }: { label: string; body: string }) {
  return (
    <div className="practice-move">
      <div className="practice-label">{label}</div>
      <p>
        <RichText text={body} />
      </p>
    </div>
  );
}

/** A question the learner asks of themselves. The answer is revealed because
 * they chose to answer it — this is not a measurement, nothing is stored,
 * and it never reaches an attempt record. */
function CheckBlock({ block }: { block: Extract<InstructionBlock, { kind: "check" }> }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const correctIndex = block.options.findIndex((option) => option.correct);
  const answered = chosen !== null;
  const right = answered && block.options[chosen]?.correct === true;

  return (
    <div className="card check">
      <div className="row spread">
        <strong>Check yourself</strong>
        <span className="badge">not scored</span>
      </div>
      <p className="check-question">
        <RichText text={block.question} />
      </p>
      {block.options.map((option, i) => {
        const state = !answered ? "" : i === correctIndex ? " right" : i === chosen ? " wrong" : " dim";
        return (
          <button
            key={i}
            className={`check-option${state}`}
            onClick={() => !answered && setChosen(i)}
            disabled={answered}
          >
            <span className="check-letter" aria-hidden="true">
              {"ABCDEFGH"[i]}
            </span>
            <span>
              <RichText text={option.text} />
            </span>
          </button>
        );
      })}
      {answered && (
        <div className={`check-explain ${right ? "right" : "wrong"}`}>
          <strong>{right ? "That is it." : "Not this time."}</strong>{" "}
          <RichText text={block.explain} />
        </div>
      )}
      {answered && (
        <button className="quiet" onClick={() => setChosen(null)}>
          Try it again
        </button>
      )}
    </div>
  );
}

/** A video the curriculum calls for. While it is `planned`, the card says so
 * in plain words and still teaches what the film will teach — a learner
 * should never meet a dead player and wonder if their app is broken. */
export function VideoBlock({ video_id, note }: { video_id: string; note: string | null }) {
  const video = instruction.videoOf(video_id);
  if (!video) return null;
  const available = video.status === "available" && video.src !== null;
  const minutes = Math.floor(video.seconds / 60);
  const seconds = video.seconds % 60;
  const length = minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;

  return (
    <div className={`card video-card ${available ? "" : "planned"}`}>
      <div className="video-thumb" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path d="M9 7.5 L17 12 L9 16.5 Z" fill="currentColor" />
          <rect x="2.5" y="3.5" width="19" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <div className="video-body">
        <div className="row spread">
          <strong>{video.title}</strong>
          <span className="badge">{length}</span>
        </div>
        <p className="video-summary">{video.summary}</p>
        {available ? (
          <video src={video.src ?? undefined} controls playsInline preload="none" className="video-player" />
        ) : (
          <p className="video-status">
            Filming planned · {video.kind} · brief {video.video_id} is written. Until it is shot, the
            lesson below teaches the same thing in words.
          </p>
        )}
        {note && <p className="video-note">{note}</p>}
      </div>
    </div>
  );
}
