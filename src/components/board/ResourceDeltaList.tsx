import type { Resources } from "../../game/types";
import { Chips } from "../frame/parts";

/** Signed resource deltas, or a quiet line when nothing changes. */
export function ResourceDeltaList({ resources }: { resources: Resources }) {
  return (
    <Chips
      amounts={resources}
      signed
      empty={<span className="resourceDeltaList neutral">No direct change</span>}
    />
  );
}
