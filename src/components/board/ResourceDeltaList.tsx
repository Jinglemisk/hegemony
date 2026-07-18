import type { Resources } from "../../game/types";
import { ResourceChips } from "./ResourceChips";

/** Signed, labelled resource deltas — event outcomes and card effects. */
export function ResourceDeltaList({ resources }: { resources: Resources }) {
  return (
    <ResourceChips
      resources={resources}
      variant="delta"
      className="resourceDeltaList"
      empty={<span className="resourceDeltaList neutral">No direct change</span>}
    />
  );
}
