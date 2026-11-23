import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Resources } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { useGameUi } from "../board/GameUiContext";
import { Panel, PanelHead } from "../chrome/Panel";
import { Ico } from "../frame/parts";
import { FOCUSABLE, focusSoon } from "../overlays/focus";
import { FootContext, type FootLine } from "./words";
import { CardsDrawer } from "./drawers/CardsDrawer";
import { AgoraDrawer, IdeasDrawer, VictoryDrawer } from "./drawers/TableDrawers";
import { RealmCities, RealmOverview, RealmPeople } from "./drawers/RealmDrawer";
import { TradeDrawer } from "./drawers/TradeDrawer";
import type { LeftActions } from "./LeftShell";
import type { PlaceSubject } from "./PlacePanel";

export type DrawerId =
  "overview" | "cities" | "people" | "ideas" | "agora" | "trade" | "victory" | "cards";

const REALM_TABS: ReadonlyArray<{ id: DrawerId; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "settlements/seal" },
  { id: "cities", label: "Cities", icon: "settlements/city" },
  { id: "people", label: "People", icon: "pops/crowd" },
];

const HEADS: Partial<Record<DrawerId, { title: string; icon: string }>> = {
  ideas: { title: "Ideas", icon: "assembly/national-idea" },
  agora: { title: "Agora", icon: "assembly/agora" },
  trade: { title: "Trade", icon: "market/handshake" },
  victory: { title: "Victory", icon: "victory/laurel" },
  cards: { title: "Cards", icon: "events/venture" },
};

/** The foot line before anything is pointed at: what there is to point at. The line's
 *  box stands whatever it says. */
const IDLE: Record<DrawerId, string> = {
  overview: "Point at a tile for what it means.",
  cities: "Point at a place for what it needs next.",
  people: "Point at a class for what it makes.",
  ideas: "Point at an Idea for what it does.",
  agora: "Point at a Law or an orator for what it does.",
  trade: "Point at an offer, a good or a deal for its terms.",
  victory: "Point at a title for what wins it.",
  cards: "Point at a card for what it does.",
};

/** What a drawer's body is given: where a pick goes, and the board's commands. */
export type DrawerProps = {
  onPick: (subject: PlaceSubject) => void;
  actions: LeftActions;
  income: Resources;
};

/**
 * A drawer: 320 wide, the full height beside the sidebar. Its head, equal tab
 * buttons where it has tabs, a body that scrolls inside a box that never resizes,
 * and a dark foot line writing the sentence of the tile last pointed at, which
 * stays when the pointer leaves.
 */
export function Drawer({
  id,
  onTab,
  onClose,
  ...body
}: DrawerProps & {
  id: DrawerId;
  onTab: (id: DrawerId) => void;
  onClose: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const realm = REALM_TABS.some((tab) => tab.id === id);
  const idle =
    id === "cards" && G.devHands[viewerId].length === 0
      ? "No cards held: buy one in the dock."
      : IDLE[id];
  const head = HEADS[id];
  const title = realm ? `Realm of ${PLAYER_GLAZES[viewerId].name}` : (head?.title ?? "");
  // The foot line belongs to the drawer and tab it was pointed in.
  const [foot, setFoot] = useState<{ for: DrawerId; line: FootLine } | null>(null);
  const line = foot?.for === id ? foot.line : null;
  const footValue = useMemo(
    () => ({ lit: line?.key ?? null, point: (next: FootLine) => setFoot({ for: id, line: next }) }),
    [id, line?.key],
  );

  // Opened (or turned to another drawer from the sidebar), it takes the focus: its
  // selected tab, else the first control in its body, else its close disc; so Tab
  // goes on from inside it rather than through the sidebar's remaining buttons.
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || root.contains(document.activeElement)) return;
    const target =
      root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ??
      root.querySelector(".lw-body")?.querySelector<HTMLElement>(FOCUSABLE) ??
      root.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus({ preventScroll: true });
  }, [id]);

  let content: ReactNode = null;
  if (id === "overview") content = <RealmOverview {...body} />;
  if (id === "cities") content = <RealmCities {...body} />;
  if (id === "people") content = <RealmPeople {...body} />;
  if (id === "ideas") content = <IdeasDrawer {...body} />;
  if (id === "agora") content = <AgoraDrawer />;
  if (id === "trade") content = <TradeDrawer {...body} />;
  if (id === "victory") content = <VictoryDrawer />;
  if (id === "cards") content = <CardsDrawer {...body} />;

  return (
    <Panel
      aria-label={title}
      className="lw-drawer ch-unroll-y"
      // Its foot meets the screen's edge: only the top corner is free.
      corners={["tr"]}
      data-c="drawer"
      data-drawer={id}
      data-exclude
      ref={ref}
      role="region"
    >
      <PanelHead
        closeLabel={`Close ${realm ? "Realm" : title}`}
        coin={realm ? viewerId : undefined}
        icon={realm ? undefined : head?.icon}
        onClose={onClose}
        title={title}
      />
      {realm ? <RealmTabs id={id} onTab={onTab} /> : null}
      <FootContext.Provider value={footValue}>
        <div
          aria-labelledby={realm ? `lw-tab-${id}` : undefined}
          className="lw-body"
          id={realm ? "lw-tabpanel" : undefined}
          role={realm ? "tabpanel" : undefined}
        >
          {content}
        </div>
      </FootContext.Provider>
      <footer aria-live="polite" className="lw-foot">
        {line ? (
          <>
            <b>{line.title}</b> {line.line}
          </>
        ) : (
          <span className="lw-foot-idle">{idle}</span>
        )}
      </footer>
    </Panel>
  );
}

/**
 * Realm's three tabs: one tab stop (the selected tab), the arrow keys, Home and End move
 * between them, and each names the panel it shows.
 */
function RealmTabs({ id, onTab }: { id: DrawerId; onTab: (id: DrawerId) => void }) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = REALM_TABS.findIndex((tab) => tab.id === id);
    const last = REALM_TABS.length - 1;
    const to =
      event.key === "ArrowRight"
        ? (at + 1) % REALM_TABS.length
        : event.key === "ArrowLeft"
          ? (at + last) % REALM_TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (to === null) return;
    event.preventDefault();
    const next = REALM_TABS[to].id;
    onTab(next);
    focusSoon(() => document.getElementById(`lw-tab-${next}`));
  };
  return (
    <div aria-label="Realm" className="lw-tabs" onKeyDown={move} role="tablist">
      {REALM_TABS.map((tab) => (
        <button
          aria-controls="lw-tabpanel"
          aria-selected={tab.id === id}
          className="lw-tab"
          id={`lw-tab-${tab.id}`}
          key={tab.id}
          onClick={() => onTab(tab.id)}
          role="tab"
          tabIndex={tab.id === id ? 0 : -1}
          type="button"
        >
          <Ico path={tab.icon} size="ui" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
