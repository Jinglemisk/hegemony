import type { ReactNode } from "react";

/**
 * The KYKLOS disc rail, shared by the left ledger rail and the right consult rail
 * (docs/feat/two-panel.md — the right rail *mirrors* the left, not a new widget). A
 * thin glass spine with menu discs threaded on it, overhanging the sea; each disc
 * switches its floating panel to one page. `side` flips which edge it hugs and which
 * way the discs overhang (left → inward-right, right → inward-left).
 *
 * The circle law: these are discs because you press them repeatedly. The one square
 * in the UI stays reserved for End Turn.
 */
export function DiscRail<T extends string>({
  side,
  tabs,
  activeTab,
  isOpen,
  onSelectTab,
  badges,
  ariaLabel,
  discTitle
}: {
  side: "left" | "right";
  tabs: Array<{ tab: T; label: string; icon: ReactNode }>;
  activeTab: T;
  isOpen: boolean;
  onSelectTab: (tab: T) => void;
  badges?: Partial<Record<T, number>>;
  ariaLabel: string;
  discTitle?: (tab: T) => string;
}) {
  const railClass = side === "right" ? "consultRail" : "ledgerRail";
  const spineClass = side === "right" ? "consultRailSpine" : "ledgerRailSpine";
  const discsClass = side === "right" ? "consultRailDiscs" : "ledgerRailDiscs";

  return (
    <nav className={railClass} aria-label={ariaLabel}>
      <div className={spineClass} aria-hidden="true" />
      <div className={discsClass}>
        {tabs.map(({ tab, label, icon }) => {
          const active = isOpen && activeTab === tab;
          const badge = badges?.[tab];

          return (
            <button
              aria-label={label}
              aria-pressed={active}
              className={active ? "railDisc railDiscActive" : "railDisc"}
              key={tab}
              onClick={() => onSelectTab(tab)}
              title={discTitle?.(tab) ?? label}
              type="button"
            >
              {icon}
              {badge && badge > 0 ? <span className="railDiscBadge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
