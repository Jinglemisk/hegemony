/**
 * Barrel for the rules engine.
 *
 * The engine used to live in this single ~1800-line file. It was decomposed into
 * cohesive modules that mirror its responsibilities, so new rules / content / modes
 * have an obvious home:
 *
 *   core/results   — MoveResult + ActionStatus shapes
 *   core/pops      — pop constants + arithmetic
 *   core/resources — resource arithmetic
 *   core/query     — board / player / log accessors
 *   core/rng       — deterministic PRNG + deck helpers
 *   core/format    — human-readable rule strings
 *   settlement     — settlement + population domain queries
 *   economy/income — the income engine (single source of the per-pop yield formula)
 *   economy/cost   — action costs under standing Laws
 *   economy/preview— economy projections + action previews
 *   status         — get*Status action validators
 *   events         — event deck draw + the event-effect interpreter
 *   actions        — the mutating moves
 *   hunger         — pops leaving when a turn ends short of food
 *   happiness      — the named terms a realm's happiness is made of
 *   year           — year / turn-flag lifecycle
 *   activeEffects  — canonical persistent-effect/status projection
 *   definition     — immutable per-match rules/content identity
 *   state          — createInitialState
 *
 * This file re-exports the public surface so existing `./rules` imports keep working.
 * New code is free to import directly from the module it needs.
 */
export * from "./ideas";
export * from "./bank";
export * from "./civic";
export * from "./content";
export * from "./core/results";
export * from "./core/pops";
export * from "./core/resources";
export * from "./core/query";
export * from "./core/rng";
export * from "./core/format";
export * from "./settlement";
export * from "./economy/income";
export * from "./economy/cost";
export * from "./economy/preview";
export * from "./status";
export * from "./events";
export * from "./actions";
export * from "./riot";
export * from "./year";
export * from "./activeEffects";
export * from "./tables";
export * from "./luxury";
export * from "./happiness";
export * from "./unrest";
export * from "./hunger";
export * from "./ventures";
export * from "./score";
export * from "./victory";
export * from "./state";
export * from "./assembly";
