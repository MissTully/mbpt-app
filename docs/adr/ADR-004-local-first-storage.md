# ADR-004: Local-first storage with export, no server dependency in release 1

**Status:** accepted · **Date:** 2026-08-10

## Context
The classroom has bad connectivity and no attempt may be lost (driver D4). A
lost attempt is a lost learner performance that cannot be recreated.

## Decision
Attempt records, case packages, configuration and activity definitions are
stored on the device (IndexedDB). Export is a file. The store is append-only,
validates on write and read, and exposes no update method. The pilot runs in a
room with no network.

## Alternatives considered
Server-first with local cache: loses attempts on the day the network is bad,
which is the day it matters. Rejected.

## Consequences, accepted deliberately
A learner's history lives on their device; changing devices loses it unless
exported. Acceptable for the pilot, and far better than building identity and
sync before the core loop is proven. Cohort reporting from a partner
institution is the trigger that moves synchronisation into scope — ask before
the pilot is scoped, not after.
