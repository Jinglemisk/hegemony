import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { VerbId } from "../board/command/verbs";
import type { DiscGroup, DiscOption } from "./discs";
import { Ico, Price } from "./parts";

const tokenPx = (name: string) =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

function OptionPrice({ option }: { option: DiscOption }) {
  if (option.prices.length === 0) {
    return option.text ? <>{option.text}</> : null;
  }

  return (
    <>
      {option.prices.map((amounts, i) => (
        <span className="price-alt" key={i}>
          {i > 0 ? <span className="price-or">·</span> : null}
          <Price amounts={amounts} short={!option.enabled} />
        </span>
      ))}
    </>
  );
}

/**
 * Where a fan's options sit: circles on an arc around the disc, aimed out of the
 * sheet along its edge's normal (straight up on the flat run, outward on the
 * curve), one option's slot apart. Step 2 replaces this with the mock's
 * collision-aware placement.
 */
function placeFan(li: HTMLLIElement) {
  const items = [...li.querySelectorAll<HTMLLIElement>(":scope > .fan > .fan-item")];
  const disc = li.getBoundingClientRect();
  const cx = disc.left + disc.width / 2;
  const cy = disc.top + disc.height / 2;
  const realm = li.closest(".realm");
  const sheet = realm?.getBoundingClientRect();
  const curve = realm ? parseFloat(getComputedStyle(realm).borderTopRightRadius) || 0 : 0;
  const arcX = sheet ? sheet.right - curve : cx;
  const arcY = sheet ? sheet.top + curve : cy;
  const aim = cx > arcX ? Math.atan2(cy - arcY, cx - arcX) : -Math.PI / 2;
  const gap = tokenPx("--board-gap") || 8;
  // Measured, not read from tokens: a calc() custom property reads back unresolved.
  const slot = (items[0]?.offsetWidth ?? 0) + gap;
  const optionDisc = items[0]?.querySelector<HTMLElement>(".fan-disc")?.offsetWidth ?? 0;
  const rho = disc.width / 2 + gap + optionDisc / 2 + slot / 2;
  const step = 2 * Math.asin(Math.min(1, slot / (2 * rho)));
  const a0 = aim - (step * (items.length - 1)) / 2;

  items.forEach((item, k) => {
    item.style.setProperty("--fx", `${Math.round(rho * Math.cos(a0 + k * step))}px`);
    item.style.setProperty("--fy", `${Math.round(rho * Math.sin(a0 + k * step))}px`);
  });
}

export function VerbDiscs({ groups, armed }: { groups: DiscGroup[]; armed: VerbId | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const li = listRef.current?.querySelector<HTMLLIElement>(`[data-group="${open}"]`);
    if (li) placeFan(li);
    const away = (event: PointerEvent) => {
      if (!li?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    const shut = () => setOpen(null);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", shut);
    };
  }, [open]);

  return (
    <ol aria-label="Verbs" className="verbs" data-c="verbs" data-gate-flex ref={listRef}>
      {groups.map((group, i) => {
        const single = group.options.length === 1 ? group.options[0] : null;
        const live = group.options.some((option) => option.enabled);
        const isOpen = open === group.id;
        const isArmed = group.options.some((option) => option.arms && option.arms === armed);
        const label = single
          ? `${group.label}: ${single.hint}`
          : `${group.label}: ${group.options.map((option) => option.label).join(", ")}`;

        return (
          <li
            className={`verb-group${live ? "" : " is-short"}${isOpen ? " is-open" : ""}${isArmed ? " is-armed" : ""}`}
            data-c="verb"
            data-group={group.id}
            key={group.id}
            style={{ "--i": i } as CSSProperties}
          >
            <button
              aria-disabled={live ? undefined : true}
              aria-expanded={single ? undefined : isOpen}
              aria-haspopup={single ? undefined : "menu"}
              aria-label={label}
              aria-pressed={single?.arms ? isArmed : undefined}
              className="verb-btn"
              onClick={() => {
                if (!single) {
                  setOpen(isOpen ? null : group.id);
                } else if (single.enabled) {
                  single.run();
                }
              }}
              type="button"
            >
              <span className="verb-disc" data-c="verb-disc" data-exclude>
                <Ico path={group.icon} size="disc" />
              </span>
              <span className="verb-name" data-c="verb-name" data-exclude>
                <span className="verb-name-k">{group.label}</span>
                <span className="verb-name-p">
                  {single ? <OptionPrice option={single} /> : "Pick one"}
                </span>
              </span>
            </button>
            {single ? null : (
              <ul aria-label={group.label} className="fan" data-gate-skip role="menu">
                {group.options.map((option, k) => (
                  <li
                    className={`fan-item${option.enabled ? "" : " is-short"}`}
                    key={option.id}
                    role="none"
                    style={{ "--k": k } as CSSProperties}
                  >
                    <button
                      aria-disabled={option.enabled ? undefined : true}
                      aria-label={`${option.label}. ${option.hint}`}
                      className="fan-btn"
                      onClick={() => {
                        if (!option.enabled) return;
                        setOpen(null);
                        option.run();
                      }}
                      role="menuitem"
                      tabIndex={isOpen ? 0 : -1}
                      type="button"
                    >
                      <span className="fan-disc">
                        <Ico path={option.icon} size="tile" />
                      </span>
                      <span className="fan-label">
                        <span className="fan-k">{option.label}</span>
                        <span className="fan-p">
                          <OptionPrice option={option} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
