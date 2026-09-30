import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent } from "react";
import type { Resources } from "../../game/types";
import { canPay } from "../../ui/frameFormat";
import type { DiscGroup, DiscOption } from "./discs";
import { Ico, Price } from "./parts";

const token = (name: string, fallback: number) =>
  typeof document === "undefined"
    ? fallback
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;

/** The open fans, outermost first: `[]`, `["build"]` or `["build", "build-civic"]`. */
type Path = string[];
const keyOf = (path: Path) => path.join("/");
const within = (path: Path, key: string) =>
  keyOf(path) === key || keyOf(path).startsWith(`${key}/`);

function OptionPrice({ option, store }: { option: DiscOption; store: Resources }) {
  return (
    <>
      {option.text ? <span>{option.text}</span> : null}
      {option.from ? <span>from</span> : null}
      {option.prices.map((amounts, i) => (
        <span className="price-alt" key={i}>
          {i > 0 ? <span className="price-or">·</span> : null}
          <Price amounts={amounts} short={!canPay(store, amounts)} />
        </span>
      ))}
      {option.gets ? (
        <>
          <span className="price-or">▸</span>
          <Price amounts={option.gets} />
        </>
      ) : null}
    </>
  );
}

/** What a price says aloud: "4 wood, 1 food for 1 gold". */
function spoken(option: DiscOption) {
  const words = (amounts: Partial<Resources>) =>
    Object.entries(amounts)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([resource, n]) => `${n} ${resource}`)
      .join(", ");
  const price = option.prices.map(words).filter(Boolean).join(" or ");
  return [
    option.text,
    price &&
      `${option.from ? "from " : ""}${price}${option.gets ? ` for ${words(option.gets)}` : ""}`,
  ]
    .filter(Boolean)
    .join(", ");
}

const findOption = (options: DiscOption[], id: string | undefined) =>
  id ? options.find((option) => option.id === id) : undefined;
const armedLeaf = (options: DiscOption[]): DiscOption | undefined =>
  options.flatMap((option) =>
    option.options ? (armedLeaf(option.options) ?? []) : option.armed ? option : [],
  )[0];

type Box = { l: number; t: number; r: number; b: number };

/** An option's circle and its label, relative to the circle's centre. */
function fanShapes(item: HTMLElement, d: number): Array<[number, number, number, number]> {
  const label = item.querySelector<HTMLElement>(":scope > .fan-btn .fan-label")!;
  const top = label.offsetTop - d / 2;
  return [
    [-d / 2, -d / 2, d / 2, d / 2],
    [-label.offsetWidth / 2, top, label.offsetWidth / 2, top + label.offsetHeight],
  ];
}

/**
 * Where a fan opens, ported from the Hybrid arc mock: its options sit on an arc
 * around the host's centre, aimed at the island's centre (a second fan: straight
 * out from the disc through its option). The arc may turn up to a right angle
 * either way and widen; the cheapest placement wins in which no circle or label
 * leaves the screen, overlaps another, or touches the chrome, a settlement's
 * mark (its seal and name), a mooring, or the open disc's hint. A second fan also keeps clear of the first fan's
 * circles and labels, so its peers stay in reach. When nothing clears the
 * settlements, they leave the walls first, then the gap between peers.
 */
function placeFan(host: HTMLElement, fanAt: WeakMap<Element, [number, number]>) {
  const items = [...host.querySelectorAll<HTMLElement>(":scope > .fan > .fan-item")];
  const n = items.length;
  if (n === 0) return;
  const d = items[0].querySelector<HTMLElement>(":scope > .fan-btn .fan-disc")!.offsetWidth;
  const gap = token("--board-gap", 8);
  const shapes = items.map((item) => fanShapes(item, d));
  const chord = Math.max(d, ...shapes.map((shape) => shape[1][2] - shape[1][0])) + 2 * gap;
  const group = host.closest<HTMLElement>(".verb-group")!;
  const disc = group.querySelector(".verb-disc")!.getBoundingClientRect();
  const dx = disc.left + disc.width / 2;
  const dy = disc.top + disc.height / 2;
  const second = host !== group;
  const [cx, cy] = second ? (fanAt.get(host) ?? [dx, dy]) : [dx, dy];
  const isle = document.querySelector(".island")?.getBoundingClientRect();
  const aim = second
    ? Math.atan2(cy - dy, cx - dx)
    : isle
      ? Math.atan2(isle.top + isle.height / 2 - cy, isle.left + isle.width / 2 - cx)
      : -Math.PI / 4;
  const pad = (r: { left: number; top: number; right: number; bottom: number }): Box => ({
    l: r.left - gap,
    t: r.top - gap,
    r: r.right + gap,
    b: r.bottom + gap,
  });
  const chrome = [...document.querySelectorAll("[data-exclude]")].map((el) =>
    pad(el.getBoundingClientRect()),
  );
  // The open disc's name tab reads as its hint: wall off the wider of the two.
  const plate = group.querySelector(".verb-name")!.getBoundingClientRect();
  const hintW = (group.querySelector<HTMLElement>(".verb-name-p")?.offsetWidth ?? 0) + 2 * gap;
  chrome.push(
    pad({ left: dx - hintW / 2, right: dx + hintW / 2, top: plate.top, bottom: plate.bottom }),
  );
  if (second) {
    for (const peer of host.parentElement!.children) {
      const at = fanAt.get(peer);
      if (!at) continue;
      for (const [l, t, r, b] of fanShapes(peer as HTMLElement, d)) {
        chrome.push(pad({ left: at[0] + l, top: at[1] + t, right: at[0] + r, bottom: at[1] + b }));
      }
    }
  }
  const marks = [
    ...document.querySelectorAll(".island .settle, .island .settle-shared, .island .moor"),
  ]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0)
    .map(pad);
  const grow = (q: Box, by: number): Box => ({
    l: q.l - by,
    t: q.t - by,
    r: q.r + by,
    b: q.b + by,
  });
  const hit = (a: Box, z: Box) => a.l < z.r && a.r > z.l && a.t < z.b && a.b > z.t;
  const boxes = ([x, y]: [number, number], k: number) =>
    shapes[k].map(([l, t, r, b]) => ({ l: x + l, t: y + t, r: x + r, b: y + b }));
  const onScreen = (q: Box) =>
    q.l >= gap && q.t >= gap && q.r <= innerWidth - gap && q.b <= innerHeight - gap;
  const rho0 = (second ? d : disc.width) / 2 + gap + d / 2;

  const search = (walls: Box[], apart: number) => {
    // Cost: one degree of turn weighs as much as two pixels of radius.
    let best: { cost: number; ps: Array<[number, number]> } | null = null;
    for (let rho = rho0; rho < rho0 + innerHeight / 2; rho += gap) {
      const step = n > 1 ? 2 * Math.asin(Math.min(1, chord / (2 * rho))) : 0;
      for (let turn = -90; turn <= 90; turn += 5) {
        const cost = Math.abs(turn) + (rho - rho0) / 2;
        if (best && cost >= best.cost) continue;
        const a0 = aim + (turn * Math.PI) / 180 - (step * (n - 1)) / 2;
        const ps = items.map(
          (_, k) =>
            [cx + rho * Math.cos(a0 + k * step), cy + rho * Math.sin(a0 + k * step)] as [
              number,
              number,
            ],
        );
        const bs = ps.map(boxes);
        const ok = bs.every((qs, k) =>
          qs.every(
            (q) =>
              onScreen(q) &&
              !walls.some((z) => hit(q, z)) &&
              bs.every((os, j) => j === k || os.every((o) => !hit(grow(q, apart), o))),
          ),
        );
        if (ok) best = { cost, ps };
      }
    }
    return best?.ps ?? null;
  };

  // Peers keep a gap apart, as they keep from everything else; when nothing
  // fits, the settlements go first, then the gap between peers.
  const ps =
    search([...chrome, ...marks], gap) ??
    search(chrome, gap) ??
    search(chrome, 0) ??
    items.map(() => [cx, cy] as [number, number]);
  ps.forEach(([x, y], k) => {
    const fx = Math.round(x - cx);
    const fy = Math.round(y - cy);
    items[k].style.setProperty("--fx", `${fx}px`);
    items[k].style.setProperty("--fy", `${fy}px`);
    fanAt.set(items[k], [cx + fx, cy + fy]);
  });
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * The verb discs on the sheet's edge and their fans.
 *
 * A fan opens after --fan-dwell of hover on its disc (or on its option, for a
 * second fan) and closes --fan-linger after the pointer has left the span of
 * the disc and its open fans, so a far option stays open while the pointer
 * crosses the sea to it; a second fan is inside its option. A disc click
 * runs the group's primary option, or opens the fan when it has none or the
 * rules refuse it (a touch screen has no hover); a click on an armed disc
 * gives the map back. Enter or ArrowUp on a disc opens its fan and moves focus
 * in; arrows walk a fan, Enter opens a second fan, Escape backs out one level.
 * The number keys act on the discs in order.
 */
export function VerbDiscs({
  groups,
  store,
}: {
  groups: DiscGroup[];
  /** The viewer's resources: a price reads short only when this cannot pay it. */
  store: Resources;
}) {
  const [path, setPath] = useState<Path>([]);
  const pathRef = useRef(path);
  pathRef.current = path;
  const listRef = useRef<HTMLOListElement | null>(null);
  const timers = useRef(new Map<string, number>());
  const pointer = useRef<[number, number]>([-1, -1]);
  const fanAt = useRef(new WeakMap<Element, [number, number]>());
  // The host whose fan takes focus once it has opened (a keyboard open).
  const focusInto = useRef<string | null>(null);

  const hostEl = useCallback(
    (key: string) => listRef.current?.querySelector<HTMLElement>(`[data-host="${key}"]`) ?? null,
    [],
  );
  const hostBtn = (key: string) =>
    hostEl(key)?.querySelector<HTMLElement>(":scope > .verb-btn, :scope > .fan-btn") ?? null;

  useLayoutEffect(() => {
    path.forEach((_, depth) => {
      const host = hostEl(keyOf(path.slice(0, depth + 1)));
      if (host) placeFan(host, fanAt.current);
    });
    if (focusInto.current && within(path, focusInto.current)) {
      hostEl(focusInto.current)
        ?.querySelector<HTMLElement>(":scope > .fan > .fan-item > .fan-btn")
        ?.focus();
    }
    focusInto.current = null;
  }, [path, hostEl]);

  const dwell = (key: string) => {
    window.clearTimeout(timers.current.get(key));
    if (within(pathRef.current, key)) return;
    timers.current.set(
      key,
      window.setTimeout(() => setPath(key.split("/")), token("--fan-dwell", 500)),
    );
  };
  /** Whether the pointer is over the span of a host and its open fans: the
   *  corridor it crosses on the way to a far option. */
  const inReach = (key: string) => {
    const host = hostEl(key);
    const [x, y] = pointer.current;
    if (!host) return false;
    const rects = [
      ...host.querySelectorAll(
        ":scope > .verb-btn, :scope > .fan-btn, :scope > .fan > .fan-item > .fan-btn, :scope .fan-item.is-open > .fan > .fan-item > .fan-btn",
      ),
    ].map((el) => el.getBoundingClientRect());
    return (
      x >= Math.min(...rects.map((r) => r.left)) &&
      x <= Math.max(...rects.map((r) => r.right)) &&
      y >= Math.min(...rects.map((r) => r.top)) &&
      y <= Math.max(...rects.map((r) => r.bottom))
    );
  };
  const linger = (key: string) => {
    window.clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      window.setTimeout(
        () => {
          if (inReach(key)) return linger(key);
          setPath((current) => (within(current, key) ? key.split("/").slice(0, -1) : current));
        },
        token("--fan-linger", 250),
      ),
    );
  };
  const hoverProps = (key: string) => ({
    "data-host": key,
    onPointerEnter: () => dwell(key),
    onPointerLeave: () => linger(key),
  });

  const pressDisc = useCallback((group: DiscGroup, keyboard: boolean) => {
    window.clearTimeout(timers.current.get(group.id));
    const armed = armedLeaf(group.options);
    const primary = findOption(group.options, group.primary);
    if (armed) {
      setPath([]);
      armed.run?.();
    } else if (primary?.enabled) {
      setPath([]);
      primary.run?.();
    } else if (within(pathRef.current, group.id)) {
      setPath([]);
    } else {
      if (keyboard) focusInto.current = group.id;
      setPath([group.id]);
    }
  }, []);

  const openFan = (key: string) => {
    focusInto.current = key;
    setPath(key.split("/"));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pathRef.current.length > 0) {
        const key = keyOf(pathRef.current);
        event.stopPropagation();
        setPath(pathRef.current.slice(0, -1));
        hostBtn(key)?.focus();
        return;
      }
      const index = Number(event.key) - 1;
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= groups.length ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        isTyping(event.target) ||
        document.querySelector('[aria-modal="true"]')
      ) {
        return;
      }
      hostBtn(groups[index].id)?.focus();
      pressDisc(groups[index], true);
    };
    const away = (event: PointerEvent) => {
      if (!listRef.current?.contains(event.target as Node)) setPath([]);
    };
    const shut = () => setPath([]);
    const track = (event: PointerEvent) => {
      pointer.current = [event.clientX, event.clientY];
    };
    document.addEventListener("pointermove", track, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("pointermove", track);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("resize", shut);
    };
    // hostBtn only reads the list ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, pressDisc]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  /** Arrows walk the fan the focus is in, and shut any fan opened beside it. */
  const walk = (event: ReactKeyboardEvent<HTMLButtonElement>, level: Path) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!move) return;
    event.preventDefault();
    event.stopPropagation();
    const fan = event.currentTarget.closest(".fan")!;
    const buttons = [...fan.querySelectorAll<HTMLElement>(":scope > .fan-item > .fan-btn")];
    const at = buttons.indexOf(event.currentTarget);
    buttons[(at + move + buttons.length) % buttons.length].focus();
    setPath(level);
  };

  const renderFan = (level: Path, label: string, options: DiscOption[]) => {
    const open = within(path, keyOf(level)) && path.length >= level.length;
    return (
      <ul aria-label={label} className="fan" data-gate-skip role="menu">
        {options.map((option, k) => {
          const key = keyOf([...level, option.id]);
          const sub = option.options;
          const isOpen = sub ? within(path, key) : false;
          const state = option.enabled ? "" : " is-short";

          return (
            <li
              className={`fan-item${state}${isOpen ? " is-open" : ""}`}
              key={option.id}
              role="none"
              style={{ "--k": k } as CSSProperties}
              {...(sub ? hoverProps(key) : {})}
            >
              <button
                aria-disabled={option.enabled ? undefined : true}
                aria-expanded={sub ? isOpen : undefined}
                aria-haspopup={sub ? "menu" : undefined}
                aria-label={[option.label, spoken(option), option.hint].filter(Boolean).join(". ")}
                aria-pressed={sub || !option.armed ? undefined : true}
                className="fan-btn"
                data-option={option.id}
                onClick={(event: MouseEvent) => {
                  if (sub) {
                    window.clearTimeout(timers.current.get(key));
                    if (event.detail === 0) focusInto.current = key;
                    setPath(key.split("/"));
                    return;
                  }
                  if (!option.enabled) return;
                  setPath([]);
                  hostBtn(level[0])?.focus();
                  option.run?.();
                }}
                onKeyDown={(event) => walk(event, level)}
                role="menuitem"
                tabIndex={open ? 0 : -1}
                type="button"
              >
                <span className="fan-disc">
                  <Ico path={option.icon} size="tile" />
                </span>
                <span className="fan-label">
                  <span className="fan-k">{option.label}</span>
                  <span className="fan-p">
                    <OptionPrice option={option} store={store} />
                  </span>
                </span>
              </button>
              {sub ? renderFan([...level, option.id], option.label, sub) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <ol aria-label="Verbs" className="verbs" data-c="verbs" data-gate-flex ref={listRef}>
      {groups.map((group, i) => {
        const primary = findOption(group.options, group.primary);
        const live = group.options.some((option) => option.enabled);
        const isOpen = within(path, group.id);
        const isArmed = Boolean(armedLeaf(group.options));
        const hotkey = i < 9 ? String(i + 1) : undefined;
        const label = primary
          ? `${group.label}: ${primary.label}, ${spoken(primary) || primary.hint}. Enter for more.`
          : `${group.label}: ${group.hint.toLowerCase()}.`;
        const gate =
          group.id === "build"
            ? {
                disc: { "data-gate-hover": "fan", "data-gate-hover-wait": 800 },
                name: {
                  "data-gate-hover": "fan-2",
                  "data-gate-hover-wait": 800,
                  "data-gate-hover-next": '[data-option="build-slaves"]',
                },
              }
            : group.id === "exchange"
              ? {
                  name: {
                    "data-gate-hover": "exchange",
                    "data-gate-hover-wait": 800,
                    "data-gate-hover-next": '[data-option="exchange-wood"]',
                  },
                }
              : {};

        return (
          <li
            className={`verb-group${live ? "" : " is-short"}${isOpen ? " is-open" : ""}${isArmed ? " is-armed" : ""}`}
            data-c="verb"
            data-group={group.id}
            key={group.id}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null) && isOpen) {
                setPath([]);
              }
            }}
            style={{ "--i": i } as CSSProperties}
            {...hoverProps(group.id)}
          >
            <button
              aria-disabled={live ? undefined : true}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-keyshortcuts={hotkey}
              aria-label={label}
              aria-pressed={isArmed || undefined}
              className="verb-btn"
              onClick={(event) => pressDisc(group, event.detail === 0)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== "ArrowUp") return;
                event.preventDefault();
                openFan(group.id);
              }}
              type="button"
            >
              <span className="verb-disc" data-c="verb-disc" data-exclude {...gate.disc}>
                <Ico path={group.icon} size="disc" />
                {hotkey ? (
                  <span aria-hidden="true" className="verb-key">
                    {hotkey}
                  </span>
                ) : null}
              </span>
              <span className="verb-name" data-c="verb-name" data-exclude {...gate.name}>
                <span className="verb-name-k">{group.label}</span>
                <span className="verb-name-p">
                  {primary ? (
                    <>
                      {primary.label}
                      <OptionPrice option={primary} store={store} />
                    </>
                  ) : (
                    group.hint
                  )}
                </span>
              </span>
            </button>
            {renderFan([group.id], group.label, group.options)}
          </li>
        );
      })}
    </ol>
  );
}
