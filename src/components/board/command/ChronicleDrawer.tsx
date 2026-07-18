import { useState } from "react";
import { UiSprite } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { ActionLogPanel } from "./ActionLogPanel";

/**
 * The chronicle's new home (refit scope 1 / Q19): a slim tab on the right edge
 * that slides the log over the map when opened.
 *
 * "One ledger" evicted the right panel, and the chronicle could not simply become
 * a ledger tab — the whole point of a running narration is that it is visible, and
 * a tab hides it behind a click. So: the log lives in a drawer, and its latest
 * line always shows as a ticker in the command bar. Closed by default; the board
 * outranks the history.
 */
export function ChronicleDrawer() {
  const { G } = useGameUi();
  const [open, setOpen] = useState(false);

  return (
    <div className={open ? "chronicleDrawer chronicleDrawerOpen" : "chronicleDrawer"}>
      <button
        aria-expanded={open}
        className="chronicleTab"
        onClick={() => setOpen((current) => !current)}
        title={open ? "Close the chronicle" : `Open the chronicle — ${G.log.length} entries`}
        type="button"
      >
        <UiSprite item="seal" className="chronicleTabIcon" />
        <span className="chronicleTabLabel">Chronicle</span>
        <span className="chronicleTabCount">{G.log.length}</span>
      </button>

      {open ? (
        <div className="chronicleDrawerBody">
          <ActionLogPanel G={G} />
        </div>
      ) : null}
    </div>
  );
}
