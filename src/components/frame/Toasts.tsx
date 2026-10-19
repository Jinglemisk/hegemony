import type { CSSProperties } from "react";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import type { Toast } from "./moments";
import { Ico } from "./parts";

/** The lane under the ticker that shows the head of the moment queue (moments.tsx). */
export function ToastLane({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  if (!toast) return null;
  const glaze = PLAYER_GLAZES[toast.about];
  return (
    <div aria-live="polite" className="toast-lane" data-c="toast-lane">
      <button
        className="toast"
        data-c="toast"
        key={toast.id}
        onClick={onDismiss}
        style={{ "--owner": glaze.color } as CSSProperties}
        type="button"
      >
        <span className="idea-seat" title={glaze.name}>
          {glaze.blazon}
        </span>
        <span className="toast-words">
          <span className="toast-kicker">{toast.kicker}</span>
          <span className="toast-body">{toast.body}</span>
        </span>
        <Ico path={toast.icon} size="tile" />
      </button>
    </div>
  );
}
