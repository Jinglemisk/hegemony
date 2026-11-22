import type { Toast } from "./moments";
import { Prose } from "../AnnotatedText";
import { SeatCoin } from "../chrome/SeatCoin";
import { Ico } from "./parts";

/**
 * The head of the moment queue (moments.tsx) as a banner that drops in under the top
 * bar, centred: the seat's coin, the kicker and at most two lines of what happened.
 * A press puts it away.
 */
export function ToastLane({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div aria-live="polite" className="toast-lane" data-c="toast-lane">
      <button
        className="toast ch-banner"
        data-c="toast"
        key={toast.id}
        onClick={onDismiss}
        type="button"
      >
        <SeatCoin className="toast-coin" seat={toast.about} />
        <span className="toast-words">
          <span className="toast-kicker">{toast.kicker}</span>
          <span className="toast-body">
            <Prose links={false}>{toast.body}</Prose>
          </span>
        </span>
        <Ico path={toast.icon} size="ui" />
      </button>
    </div>
  );
}
