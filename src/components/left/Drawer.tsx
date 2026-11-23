import { useMemo, useState, type ReactNode } from "react";
import type { Resources } from "../../game/types";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { useGameUi } from "../board/GameUiContext";
import { Panel, PanelHead } from "../chrome/Panel";
import { Ico } from "../frame/parts";
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
  ideas: { title: "National Ideas", icon: "assembly/national-idea" },
  agora: { title: "Agora", icon: "assembly/agora" },
  trade: { title: "Trade", icon: "market/handshake" },
  victory: { title: "Victory", icon: "victory/laurel" },
  cards: { title: "Cards", icon: "events/venture" },
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
  const { viewerId } = useGameUi();
  const realm = REALM_TABS.some((tab) => tab.id === id);
  const head = HEADS[id];
  const title = realm ? `Realm of ${PLAYER_GLAZES[viewerId].name}` : (head?.title ?? "");
  // The foot line belongs to the drawer and tab it was pointed in.
  const [foot, setFoot] = useState<{ for: DrawerId; line: FootLine } | null>(null);
  const line = foot?.for === id ? foot.line : null;
  const footValue = useMemo(
    () => ({ lit: line?.key ?? null, point: (next: FootLine) => setFoot({ for: id, line: next }) }),
    [id, line?.key],
  );

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
      role="region"
    >
      <PanelHead
        closeLabel={`Close ${realm ? "Realm" : title}`}
        coin={realm ? viewerId : undefined}
        icon={realm ? undefined : head?.icon}
        onClose={onClose}
        title={title}
      />
      {realm ? (
        <div aria-label="Realm" className="lw-tabs" role="tablist">
          {REALM_TABS.map((tab) => (
            <button
              aria-selected={tab.id === id}
              className="lw-tab"
              key={tab.id}
              onClick={() => onTab(tab.id)}
              role="tab"
              type="button"
            >
              <Ico path={tab.icon} size="ui" />
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <FootContext.Provider value={footValue}>
        <div className="lw-body">{content}</div>
      </FootContext.Provider>
      <footer aria-live="polite" className="lw-foot">
        {line ? (
          <>
            <b>{line.title}</b> {line.line}
          </>
        ) : (
          <span className="lw-foot-idle">Point at a tile for what it does.</span>
        )}
      </footer>
    </Panel>
  );
}
