import { useCallback, useEffect, useRef } from "react";
import type { ConsultTab } from "../types";
import { ConsultPanel } from "../ledger/ConsultPanel";
import { CONSULT_TABS } from "../ledger/tabs";
import { Icon } from "../../../ui/icons/Icon";

export function ConsultDrawer({
  activeTab,
  codexTarget,
  isOpen,
  onClose,
  onSelectTab,
}: {
  activeTab: ConsultTab;
  codexTarget?: { chapter: string; nonce: number } | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ConsultTab) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const tabRefs = useRef(new Map<ConsultTab, HTMLButtonElement>());
  const closeAndRestoreFocus = useCallback(() => {
    onClose();
    requestAnimationFrame(() => tabRefs.current.get(activeTab)?.focus({ preventScroll: true }));
  }, [activeTab, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    drawerRef.current?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeAndRestoreFocus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeAndRestoreFocus, isOpen]);

  return (
    <div className={`consultDrawerDock${isOpen ? " isOpen" : ""}`}>
      <nav className="consultDrawerRail" aria-label="Consult pages">
        {CONSULT_TABS.map(({ tab, label, glyph }) => {
          const active = isOpen && activeTab === tab;

          return (
            <button
              aria-controls="consult-drawer"
              aria-expanded={active}
              aria-pressed={active}
              className={`consultDrawerTab${active ? " isActive" : ""}`}
              key={tab}
              onClick={() => onSelectTab(tab)}
              ref={(node) => {
                if (node) tabRefs.current.set(tab, node);
                else tabRefs.current.delete(tab);
              }}
              type="button"
            >
              <Icon glyph={glyph} size="rail" />
              <span className="label">{label}</span>
            </button>
          );
        })}
      </nav>

      {isOpen ? (
        <aside
          aria-label={`${CONSULT_TABS.find(({ tab }) => tab === activeTab)?.label ?? "Consult"} drawer`}
          className="consultDrawer"
          id="consult-drawer"
          ref={drawerRef}
          tabIndex={-1}
        >
          <button
            aria-label="Close consult drawer"
            className="consultDrawerClose verb"
            onClick={closeAndRestoreFocus}
            type="button"
          >
            Close <span aria-hidden="true">×</span>
          </button>
          <ConsultPanel activeTab={activeTab} codexTarget={codexTarget} />
        </aside>
      ) : null}
    </div>
  );
}
