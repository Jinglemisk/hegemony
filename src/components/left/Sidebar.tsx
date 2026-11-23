import { Fragment } from "react";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../frame/parts";
import type { DrawerId } from "./Drawer";

/** The sidebar's buttons, top to bottom; the anthemion stands between the two groups. */
const BUTTONS: ReadonlyArray<{ id: DrawerId; name: string; icon: string; says: string }> = [
  { id: "overview", name: "Realm", icon: "settlements/seal", says: "Your places and people." },
  { id: "ideas", name: "Ideas", icon: "assembly/national-idea", says: "The National Ideas." },
  { id: "agora", name: "Agora", icon: "assembly/agora", says: "What the Assembly left standing." },
  { id: "trade", name: "Trade", icon: "market/handshake", says: "Offers, goods and deals." },
  {
    id: "victory",
    name: "Victory",
    icon: "victory/laurel",
    says: "The titles and who holds them.",
  },
  { id: "cards", name: "Cards", icon: "events/venture", says: "Your hand and the deck." },
];

const REALM_TABS: readonly DrawerId[] = ["overview", "cities", "people"];

/**
 * The sidebar: one full-height column under the top bar, drawn as a Greek column (a
 * capital, a fluted shaft edged in the key pattern, an anthemion between its two
 * groups of buttons, a base). It never moves or changes size. The open drawer's
 * button is pressed and points into it.
 */
export function Sidebar({
  open,
  onOpen,
}: {
  open: DrawerId | null;
  onOpen: (id: DrawerId) => void;
}) {
  return (
    <nav aria-label="Drawers" className="lw-side" data-c="sidebar" data-exclude>
      {BUTTONS.map(({ id, name, icon, says }, index) => {
        const pressed = open === id || (id === "overview" && REALM_TABS.includes(open ?? "ideas"));
        return (
          <Fragment key={id}>
            {index === 3 ? <i aria-hidden="true" className="lw-side-sep" /> : null}
            <Tooltip
              content={
                <Tip title={name}>
                  <TipBody>{says}</TipBody>
                </Tip>
              }
              side="right"
              triggerClassName="lw-side-tip"
            >
              <button
                aria-label={name}
                aria-pressed={pressed}
                className="lw-side-btn"
                data-drawer={id}
                onClick={() => onOpen(id)}
                type="button"
              >
                <Ico path={icon} size="tile" />
              </button>
            </Tooltip>
          </Fragment>
        );
      })}
    </nav>
  );
}
