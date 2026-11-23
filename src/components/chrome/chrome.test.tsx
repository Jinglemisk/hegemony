// @vitest-environment jsdom

import { act, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReturnFocus } from "../overlays/focus";
import { fitScale } from "./canvas";
import { ConfirmHost, ConfirmProvider } from "./Confirm";
import { useConfirm, type ConfirmAsk } from "./confirmContext";
import { CloseDisc, Knob, Lacquer, Plaque } from "./controls";
import { HudCanvas } from "./HudCanvas";
import { Band, Panel, PanelHead } from "./Panel";
import { SeatCoin } from "./SeatCoin";
import { Socket, SocketMeter } from "./Socket";
import { useTextScale } from "./textScale";

let container: HTMLDivElement;
let root: Root;

const store = new Map<string, string>();

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // This Node's own localStorage shadows jsdom's and has no file: a memory one stands in.
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.style.removeProperty("--text-scale");
  vi.unstubAllGlobals();
});

const render = (node: React.ReactNode) => act(() => root.render(node));

describe("the HUD canvas", () => {
  it("fits the 1440×900 design to the screen, held to 0.75…2", () => {
    expect(fitScale(1440, 900)).toBe(1);
    expect(fitScale(1920, 1080)).toBeCloseTo(1.2);
    expect(fitScale(1280, 800)).toBeCloseTo(0.889, 3);
    expect(fitScale(800, 500)).toBe(0.75);
    expect(fitScale(5120, 2880)).toBe(2);
  });

  it("gives overlays a layer inside the canvas", () => {
    render(<HudCanvas>hud</HudCanvas>);
    expect(document.querySelector(".hud-canvas > #hud-overlays")).not.toBeNull();
  });
});

describe("the Text size setting", () => {
  function Sizes() {
    const [scale, setScale] = useTextScale();
    return (
      <button onClick={() => setScale("largest")} type="button">
        {scale}
      </button>
    );
  }

  it("writes the factor on <html> and keeps it", () => {
    render(<Sizes />);
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("standard");
    act(() => button.click());
    expect(button.textContent).toBe("largest");
    expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe("1.3");
    expect(store.get("hegemony.textScale")).toBe("largest");
  });
});

describe("the drawn controls", () => {
  it("keeps an unavailable control focusable and swallows its click", () => {
    const onClick = vi.fn();
    render(
      <>
        <Lacquer disabled onClick={onClick}>
          Promote
        </Lacquer>
        <Plaque onClick={onClick}>Cancel</Plaque>
        <Knob label="Promote a freeman" onClick={onClick}>
          ▲
        </Knob>
        <CloseDisc label="Close Samos" onClick={onClick} />
      </>,
    );
    const [lacquer, plaque, knob, close] = container.querySelectorAll("button");
    expect(lacquer.disabled).toBe(false);
    expect(lacquer.getAttribute("aria-disabled")).toBe("true");
    act(() => lacquer.click());
    expect(onClick).not.toHaveBeenCalled();
    act(() => plaque.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(knob.getAttribute("aria-label")).toBe("Promote a freeman");
    expect(close.getAttribute("aria-label")).toBe("Close Samos");
  });
});

describe("the frame", () => {
  it("draws a panel with its head, its corners, a band, sockets and coins", () => {
    const onBack = vi.fn();
    render(
      <Panel corners={["tr", "br"]}>
        <PanelHead
          back="Cities"
          coin="0"
          onBack={onBack}
          onClose={() => {}}
          sub="Your colony"
          title="Samos"
        />
        <Band end="6" label="Your settlements" />
        <Socket onClick={() => {}} state="open">
          Open
        </Socket>
        <SocketMeter label="People 1 of 3" n={3} value={1} worked={1} />
      </Panel>,
    );
    expect(container.querySelectorAll(".ch-corner")).toHaveLength(2);
    expect(container.querySelector("h2")?.textContent).toBe("Samos");
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("Damon");
    const back = container.querySelector<HTMLButtonElement>('[aria-label="Back to Cities"]')!;
    act(() => back.click());
    expect(onBack).toHaveBeenCalled();
    const meter = container.querySelector('[role="meter"]')!;
    expect([...meter.children].map((cell) => cell.getAttribute("data-fill"))).toEqual([
      "gold",
      null,
      null,
    ]);
  });

  it("strikes each seat's coin in its own glaze", () => {
    render(<SeatCoin seat="3" size={36} />);
    const coin = container.querySelector<HTMLElement>(".ch-coin")!;
    expect(coin.dataset.glaze).toBe("kinnabari");
    expect(coin.style.getPropertyValue("--coin-d")).toBe("36px");
  });
});

describe("the confirm bar", () => {
  function Asker({ question }: { question: ConfirmAsk }) {
    const ask = useConfirm();
    useEffect(() => ask(question), [ask, question]);
    return null;
  }

  const question = (onYes: () => void): ConfirmAsk => ({
    icon: "events/convoy",
    question: "Are you sure you want to buy a card?",
    detail: "This will cost 2 gold: gold 2 → 0",
    verb: "Buy a card",
    onYes,
  });

  const open = (onYes: () => void) =>
    render(
      <ConfirmProvider>
        <Asker question={question(onYes)} />
        <ConfirmHost />
      </ConfirmProvider>,
    );

  it("is a named dialog with focus on the verb, and yes runs the action once", () => {
    const onYes = vi.fn();
    open(onYes);
    const dialog = container.querySelector('[role="alertdialog"]')!;
    const name = document.getElementById(dialog.getAttribute("aria-labelledby")!);
    expect(name?.textContent).toBe("Are you sure you want to buy a card?");
    const verb = [...dialog.querySelectorAll("button")].find(
      (b) => b.textContent === "Buy a card",
    )!;
    expect(document.activeElement).toBe(verb);
    act(() => verb.click());
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("answers no to Escape and to a press outside the bar", () => {
    const onYes = vi.fn();
    open(onYes);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);
    open(onYes);
    const scrim = container.querySelector(".ch-confirm-scrim")!;
    act(() => {
      scrim.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onYes).not.toHaveBeenCalled();
  });

  it("makes the rest inert, and gives the focus back to the control that asked", () => {
    function Buy() {
      const ask = useConfirm();
      return (
        <button onClick={() => ask(question(() => {}))} type="button">
          Buy
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <div className="frame">
          <Buy />
          <div className="host">
            <ConfirmHost />
          </div>
        </div>
      </ConfirmProvider>,
    );
    const buy = container.querySelector<HTMLButtonElement>("button")!;
    act(() => {
      buy.focus();
      buy.click();
    });
    const verb = [...container.querySelectorAll<HTMLButtonElement>(".ch-confirm button")].at(-1);
    expect(document.activeElement).toBe(verb);
    expect(buy.inert).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(buy.inert).toBe(false);
    expect(document.activeElement).toBe(buy);
  });

  it("asked from a pop's option as the pop closes, gives the focus back to what opened the pop", () => {
    function Pop({ onPick }: { onPick: () => void }) {
      const ref = useRef<HTMLDivElement>(null);
      useReturnFocus(ref);
      return (
        <div ref={ref}>
          <button onClick={onPick} type="button">
            Estate
          </button>
        </div>
      );
    }
    function Place() {
      const ask = useConfirm();
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Raise a building
          </button>
          {open ? (
            <Pop
              onPick={() => {
                setOpen(false);
                ask(question(() => {}));
              }}
            />
          ) : null}
        </>
      );
    }
    render(
      <ConfirmProvider>
        <Place />
        <ConfirmHost />
      </ConfirmProvider>,
    );
    const raise = container.querySelector<HTMLButtonElement>("button")!;
    act(() => {
      raise.focus();
      raise.click();
    });
    const estate = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Estate",
    )!;
    expect(document.activeElement).toBe(estate);
    act(() => estate.click());
    expect(document.activeElement?.textContent).toBe("Buy a card");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.activeElement).toBe(raise);
  });

  it("answers yes to Enter", () => {
    const onYes = vi.fn();
    open(onYes);
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onYes).toHaveBeenCalledTimes(1);
  });
});
