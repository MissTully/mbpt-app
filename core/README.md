# core

Pure logic. No framework, no browser, no camera, no audio, no device library, no
network, no clock reads. The only permitted external import is `zod`, the schema
validator that produces both the compile-time types and the runtime validation
from a single definition (ARC-MBPT-001 section 4.9).

The boundary is enforced by `tools/boundary-check` on every commit, not by review.

The test that tells you the boundary is intact: the scorer and mastery engine run
from a command line over a JSON attempt record, with no browser anywhere, in
under a second.
