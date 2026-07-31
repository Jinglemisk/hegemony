import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TunePanel } from "./TunePanel";
import { resolveTuning } from "./tuning";
import { installGameContent } from "../game/content";
import { GAME_MODES } from "../game/ruleset";
import { createInitialState } from "../game/state";

function memoryStorage(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      location: { search: "?tune" },
      localStorage: memoryStorage({
        "hegemony-dev-tune-open": "1",
        "hegemony-dev-tuning-preset-v1": "low-number-core-v1",
      }),
    },
  });
});

afterEach(() => {
  installGameContent(null);
  Reflect.deleteProperty(globalThis, "window");
});

describe("TunePanel low-number preset", () => {
  it("shows active state and effective terrain/building values", () => {
    const resolved = resolveTuning(GAME_MODES.standard.ruleset, "low-number-core-v1");
    installGameContent(resolved.content);
    const game = createInitialState(42, resolved.ruleset);
    const markup = renderToStaticMarkup(<TunePanel game={game} resetGame={() => undefined} />);

    expect(markup).toContain("✓ Low Numbers · 20W / 12S / 16F");
    expect(markup).toContain("preset active");
    expect(markup).toContain("Low-number core + 0 edits");
    expect(markup).toContain("wood 20 · stone 12 · food 16");
    expect(markup).toContain("Marketplace");
    expect(markup).toContain('value="6"');
  });
});
