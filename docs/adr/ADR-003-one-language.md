# ADR-003: One language across core, adapters, application and tools

**Status:** accepted · **Date:** 2026-08-10

## Context
The core must run in a phone browser during a live attempt, in a test harness
on a laptop, and server side for batch scoring (PPP-MBPT-004 section 5.2). The
team is small and the system must fit in one person's head (driver D8).

## Decision
TypeScript everywhere. One toolchain, one test runner, one package manager,
one mental model. The attempt record's ~25 fields are typed: a missing
`scaffold_state` is a build failure, not a mastery rule silently evaluating
against undefined. Zod provides runtime validation and compile-time types from
a single definition, so the schema cannot drift from the types.

## Alternatives considered
- **Python core + TypeScript app:** requires a WebAssembly bridge for the
  browser; doubles tooling for one person. Rejected.
- **Rust core via WebAssembly:** attractive for the estimator inner loop;
  rejected for release 1 on learning-curve grounds and because the pressure
  computation is not the bottleneck. Revisit only if profiling shows the
  estimator is the binding cost — the port boundary makes it a contained swap.
