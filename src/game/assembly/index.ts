/**
 * The Assembly & Politicians layer (Phase 3-B · docs/feat/assembly-politicians.md).
 *
 *   types    — the state shapes, the LawEffect / DirectiveEffect vocabularies
 *   deck     — the four politicians and the 31-card starter deck (content)
 *   laws     — the standing-modifier layer the economy pipelines consult
 *   power    — board-derived power, patrons, the Voice metric, Stratokles's coup
 *   assembly — cadence, the proposal round, the ballot, enactment
 */
export * from "./types";
export * from "./deck";
export * from "./laws";
export * from "./power";
export * from "./assembly";
