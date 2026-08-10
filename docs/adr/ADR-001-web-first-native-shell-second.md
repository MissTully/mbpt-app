# ADR-001: Web application first, native shell second

**Status:** accepted · **Date:** 2026-08-10

## Context
The product must reach every learner on the phone already in their pocket, on
both mobile platforms, and later run on glasses without a rebuild (driver D2,
PPP-MBPT-004 section 5.1). The pilot must be startable without store approval.

## Decision
An installable progressive web application, offline-first, using standard
browser camera and audio interfaces. A thin native shell is added afterwards,
wrapping the same application, for store distribution and deeper camera access.

## Alternatives considered
- **Native first (Swift/Kotlin):** excludes one platform's learners on day
  one; recovering them forces a rewrite. Rejected.
- **Cross-platform native framework:** solves two platforms but not glasses,
  adds a heavy dependency exactly where precise camera and audio control is
  needed, and loses the no-install pilot property. Rejected.

## Consequences
Slightly less camera control and less controllable audio latency than native;
both recoverable through the shell. The reverse mistake is not recoverable
without a rewrite. Milestones M1 and M5 measure whether the browser is good
enough on real devices; ARC-MBPT-001 section 11 states the conditions under
which this decision would be wrong.
