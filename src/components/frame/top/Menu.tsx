import { useRef, useState } from "react";
import { PLAYER_IDS } from "../../../game/data";
import type { PlayerId } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../../board/GameUiContext";
import { Panel } from "../../chrome/Panel";
import { Plaque } from "../../chrome/controls";
import { SeatCoin } from "../../chrome/SeatCoin";
import { useTextScale } from "../../chrome/textScale";
import type { TextScale } from "../../chrome/textScale";
import { ESCAPE } from "../../overlays/escapeStack";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../parts";
import { MENU_WINDOWS, WINDOW_FACE } from "./windowState";
import type { MenuWindows } from "./windowState";

const TEXT_SIZES: Array<{ scale: TextScale; label: string }> = [
  { scale: "standard", label: "Standard" },
  { scale: "large", label: "Large" },
  { scale: "largest", label: "Largest" },
];

/**
 * The menu at the bar's right end: a bronze plaque that drops a card with the
 * windows (Codex, Costs, Plates), the hotseat's View as, and the Text size.
 */
export function Menu({
  windows,
  onViewAs,
}: {
  windows: MenuWindows;
  /** Take another seat's view: the hotseat's switch. */
  onViewAs: (seat: PlayerId) => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Tooltip
        content={
          <Tip title="Menu">
            <TipBody>Codex, Costs and Plates as windows you can move, View as, Text size.</TipBody>
          </Tip>
        }
        triggerClassName="menu-tip"
      >
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          className="menu-btn"
          data-c="menu-btn"
          onClick={() => setOpen((value) => !value)}
          ref={button}
          type="button"
        >
          <i aria-hidden="true" className="menu-bars" />
          Menu
        </button>
      </Tooltip>
      {open ? (
        <Popover
          anchor={button}
          ariaLabel="Menu"
          className="top-pop menu-pop"
          dismissOnOutside
          escapeRank={ESCAPE.menu}
          focusFirst
          onDismiss={() => setOpen(false)}
          slot
        >
          <MenuCard
            onViewAs={(seat) => {
              onViewAs(seat);
              setOpen(false);
            }}
            onWindow={(id) => {
              windows.show(id);
              setOpen(false);
            }}
            openWindows={windows.open}
          />
        </Popover>
      ) : null}
    </>
  );
}

function MenuCard({
  openWindows,
  onWindow,
  onViewAs,
}: {
  openWindows: MenuWindows["open"];
  onWindow: MenuWindows["show"];
  onViewAs: (seat: PlayerId) => void;
}) {
  const { G, viewerId, currentPlayerId } = useGameUi();
  const [scale, setScale] = useTextScale();

  return (
    <Panel className="menu-card" corners={["bl"]}>
      <div className="menu-body">
        <ul className="menu-rows">
          {MENU_WINDOWS.map((id) => {
            const face = WINDOW_FACE[id];
            const isOpen = openWindows.includes(id);
            return (
              <li key={id}>
                <button
                  aria-label={`${face.title}: ${face.sub}${isOpen ? ", open" : ""}`}
                  className="menu-row"
                  data-c="menu-row"
                  data-window={id}
                  onClick={() => onWindow(id)}
                  type="button"
                >
                  <Ico path={face.icon} size="tile" />
                  <span className="menu-row-words">
                    <b className="menu-row-name">{face.title}</b>
                    <span className="menu-row-sub">{face.sub}</span>
                  </span>
                  {isOpen ? <em className="menu-row-open">Open</em> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <section aria-label="View as" className="menu-sec">
          <h3 className="menu-sec-label">View as</h3>
          {/* Two seats a row; at Large and Largest one, so every name shows whole. */}
          <div className={`menu-seats${scale === "standard" ? "" : " is-rows"}`}>
            {PLAYER_IDS.map((seat) => {
              const glaze = PLAYER_GLAZES[seat];
              const acting = seat === currentPlayerId;
              const viewing = seat === viewerId;
              const cards = G.devHands[seat].length;
              return (
                <button
                  aria-label={`${glaze.name}${acting ? ", acting" : ""}${cards ? `, ${cards} ${cards === 1 ? "card" : "cards"}` : ""}${viewing ? ", your seat" : ", view as this seat"}`}
                  aria-pressed={viewing}
                  className="menu-seat"
                  data-c="view-as"
                  key={seat}
                  onClick={() => onViewAs(seat)}
                  type="button"
                >
                  <SeatCoin seat={seat} size={28} />
                  <span className="menu-seat-name">{glaze.name}</span>
                  {acting ? (
                    <span aria-hidden="true" className="menu-seat-tag">
                      <Ico path="events/end-turn" size="chip" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
        <section aria-label="Text size" className="menu-sec">
          <h3 className="menu-sec-label">Text size</h3>
          <div className="menu-sizes" role="group" aria-label="Text size">
            {TEXT_SIZES.map(({ scale: option, label }) => (
              <Plaque aria-pressed={scale === option} key={option} onClick={() => setScale(option)}>
                {label}
              </Plaque>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}
