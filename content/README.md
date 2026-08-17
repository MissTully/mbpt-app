# content

Versioned data the application consumes; never code. Threshold configuration
(with changelog — invariant I-2), activity definitions (generated from the
Crosswalk workbook by tools/crosswalk-export, **never hand edited**), expected
response sets, feedback templates, and the evidence alias map. Retired
versions are never deleted, or old attempts cannot be re-scored.

`instruction/` holds the teaching layer — lesson pages, the glossary behind
every tappable clinical word, and the video register — with its own authoring
rules and changelog. It is hand authored, unlike the activity definitions,
and it is the one part of this directory a build check reads for reading
level as well as for schema (`npm run readability`).
