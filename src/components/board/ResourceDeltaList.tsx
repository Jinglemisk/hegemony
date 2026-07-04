import type { Resources } from "../../game/types";
import { RESOURCE_LABELS, formatSignedNumber } from "../../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../../ui/resourceVisuals";
import { ResourceIcon } from "../Sprites";

export function ResourceDeltaList({ resources }: { resources: Resources }) {
  const entries = RESOURCE_ORDER.filter((resource) => resources[resource] !== 0);

  if (entries.length === 0) {
    return <span className="resourceDeltaList neutral">No direct change</span>;
  }

  return (
    <span className="resourceDeltaList">
      {entries.map((resource) => (
        <span
          className={resources[resource] > 0 ? "positive" : "negative"}
          key={resource}
          style={resourceCssVars(resource)}
        >
          <ResourceIcon resource={resource} value={resources[resource]} className="miniResourceIcon" />
          {formatSignedNumber(resources[resource])} {RESOURCE_LABELS[resource]}
        </span>
      ))}
    </span>
  );
}
