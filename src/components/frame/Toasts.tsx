import type { Toast } from "./moments";
import { Prose } from "../AnnotatedText";
import { SeatCoin } from "../chrome/SeatCoin";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody } from "./parts";

/**
 * The head of the moment queue (moments.tsx) as a banner that drops in under the top
 * bar, centred: the seat's coin, the kicker and at most two lines of what happened
 * (one at Largest text); its tooltip says it whole. A press puts it away.
 */
export function ToastLane({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div aria-live="polite" className="toast-lane" data-c="toast-lane">
      <Tooltip
        content={
          <Tip title={toast.kicker}>
            <TipBody>{toast.body}</TipBody>
            <p className="tip-act">Click to put it away</p>
          </Tip>
        }
        key={toast.id}
        triggerAs="div"
      >
        <button className="toast ch-banner" data-c="toast" onClick={onDismiss} type="button">
          <SeatCoin className="toast-coin" seat={toast.about} />
          <span className="toast-words">
            <span className="toast-kicker">{toast.kicker}</span>
            <span className="toast-body">
              <Prose links={false}>{toast.body}</Prose>
            </span>
          </span>
          <Ico path={toast.icon} size="ui" />
        </button>
      </Tooltip>
    </div>
  );
}
