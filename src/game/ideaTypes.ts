import type { LawEffect } from "./assembly/types";
import type { GrowablePop } from "./types";

export type NationalIdeaId =
  | "good-harvest"
  | "public-dole"
  | "urban-planning"
  | "capital-works"
  | "civic-tradition"
  | "frontier-charter"
  | "new-settlers"
  | "city-pioneers"
  | "slave-colonies"
  | "harbour-planning"
  | "treasury-grant"
  | "assembly-brokers";

export interface NationalIdeaDefinition {
  id: NationalIdeaId;
  name: string;
  text: string;
  effects: LawEffect[];
}
export interface NationalIdeaOwnership {
  id: NationalIdeaId;
  acquired: "setup" | "purchase";
  year: number;
}
export interface IdeaPopChoice {
  tileId: string;
  pop: GrowablePop;
}
