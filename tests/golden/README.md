# golden set

Checked-in attempt records with **hand-derived** expected scores, run on every
commit. The expected values were derived from the objective definitions and
threshold configuration by hand (the derivation is commented in each
fixture's generator notes), never by running the scorer and saving its output
— that would be circular and catch nothing.

Pending: review of these expected scores by the learning engineer, so the
"both roles together" condition of build plan task 2.7 is met. When a
threshold changes, regenerate deliberately and review the diff line by line —
that review is the audit trail.
