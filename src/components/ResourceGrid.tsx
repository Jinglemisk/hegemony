import type { Resource } from "../game/types";
import { RESOURCE_LABELS } from "../ui/formatters";
import { AtlasIcon } from "./Sprites";

export function ResourceGrid({ resources }: { resources: Record<Resource, number> }) {
  return (
    <div className="resourceGrid">
      {(Object.keys(resources) as Resource[]).map((resource) => {
        return (
          <div className={`resourcePill resource-${resource}`} key={resource}>
            <AtlasIcon icon={resource} className="resourceIcon" />
            <span>{RESOURCE_LABELS[resource]}</span>
            <strong>{resources[resource]}</strong>
          </div>
        );
      })}
    </div>
  );
}
