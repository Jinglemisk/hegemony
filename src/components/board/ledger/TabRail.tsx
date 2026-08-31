import type { GlyphId } from "../../../ui/icons/glyphs";
import { Icon } from "../../../ui/icons/Icon";

/**
 * The docked tab rail — a slip-coloured spine at the screen's edge with its tabs
 * vertically centred, and the tablet's page beside it.
 *
 * It replaces the floating disc rail. Those discs overhung the sea on a glass
 * spine, which meant the ledger read as something *laid over* the board rather
 * than part of the table; and a disc is the shape this UI reserves for things you
 * press repeatedly, which a tab is not — you press a tab once and then read.
 *
 * `side` flips which edge the rail hugs and which side the active tab's clay
 * marker lands on, so left and right stay true mirrors.
 */
export function TabRail<T extends string>({
  side,
  tabs,
  activeTab,
  isOpen,
  onSelectTab,
  badges,
  ariaLabel,
  tabTitle,
}: {
  side: "left" | "right";
  tabs: Array<{ tab: T; label: string; glyph: GlyphId; src?: string }>;
  activeTab: T;
  isOpen: boolean;
  onSelectTab: (tab: T) => void;
  badges?: Partial<Record<T, number>>;
  ariaLabel: string;
  tabTitle?: (tab: T) => string;
}) {
  return (
    <nav className={`tabRail tabRail-${side}`} aria-label={ariaLabel}>
      {tabs.map(({ tab, label, glyph, src }) => {
        const active = isOpen && activeTab === tab;
        const badge = badges?.[tab];

        return (
          <button
            aria-label={label}
            aria-pressed={active}
            className={active ? "railTab railTabOn" : "railTab"}
            key={tab}
            onClick={() => onSelectTab(tab)}
            title={tabTitle?.(tab) ?? label}
            type="button"
          >
            <Icon glyph={glyph} size="rail" src={src} />
            {badge && badge > 0 ? <span className="railTabBadge num">{badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
