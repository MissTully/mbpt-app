#!/usr/bin/env node
// Crosswalk export: reads the ActivityUX sheet of the Crosswalk workbook and
// generates content/activities.json. The workbook is the single source of
// truth (INSTR-MBPT-001 section 6.8 / ARC section 4.8); the export is
// generated, never hand edited, so the learning engineer keeps working where
// they already work.
//
// Usage: node tools/crosswalk-export/export.mjs [workbook.xlsx] [out.json]

import AdmZip from "adm-zip";
import { writeFileSync } from "node:fs";

const workbookPath =
  process.argv[2] ?? "Encountive_MBPT_UX_Curriculum_Crosswalk-3.xlsx";
const outPath = process.argv[3] ?? "content/activities.json";

const zip = new AdmZip(workbookPath);
const read = (name) => zip.getEntry(name).getData().toString("utf8");

// Shared strings.
const sharedXml = read("xl/sharedStrings.xml");
const strings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
  [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
    .map((t) => decodeEntities(t[1]))
    .join(""),
);

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Sheet name -> file, via workbook.xml + rels.
const workbookXml = read("xl/workbook.xml");
const relsXml = read("xl/_rels/workbook.xml.rels");
const sheetRel = Object.fromEntries(
  [...workbookXml.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)].map(
    (m) => [m[1], m[2]],
  ),
);
const relTarget = Object.fromEntries(
  [...relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="(worksheets\/[^"]+)"/g)].map(
    (m) => [m[1], m[2]],
  ),
);
const activitySheet = read(`xl/${relTarget[sheetRel["ActivityUX"]]}`);

// Parse rows.
const rows = [...activitySheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(
  (rowMatch) => {
    const cells = {};
    // Tokenise cells first (a value-less cell must not swallow its
    // neighbour's <v> in a lazy match), then parse each cell alone.
    for (const cell of rowMatch[1].matchAll(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const chunk = cell[0];
      const ref = chunk.match(/r="([A-Z]+)\d+"/);
      const value = chunk.match(/<v>([\s\S]*?)<\/v>/);
      if (!ref || !value) continue;
      const isShared = /t="s"/.test(chunk.slice(0, chunk.indexOf(">")));
      cells[ref[1]] = isShared ? strings[Number(value[1])] : value[1];
    }
    return cells;
  },
);

const activities = [];
for (const row of rows) {
  const id = row.A ?? "";
  if (!/^A-\d+\.\d+\.\d+$/.test(id)) continue;
  activities.push({
    activity_id: id,
    module: row.B ?? "",
    lesson: row.C ?? "",
    title: row.D ?? "",
    type: row.E ?? "",
    minutes: Number(row.F ?? 0),
    surface: row.G ?? "",
    scaffold: row.H ?? "n/a",
    objectives: (row.I ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    entry_state: row.J ?? "",
    learner_action: row.K ?? "",
    input_modality: row.L ?? "",
    system_response: row.M ?? "",
    evidence_captured: (row.N ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    exit_condition: row.O ?? "",
    release: row.P ?? "",
  });
}

if (activities.length !== 61) {
  console.error(
    `Expected 61 activities (INSTR-MBPT-001 Appendix B), parsed ${activities.length}. Refusing to write.`,
  );
  process.exit(1);
}

const catalog = {
  generated_from: workbookPath,
  generated_at: "workbook-3", // content identity, not a wall-clock read
  activities,
};
writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`wrote ${activities.length} activities to ${outPath}`);
