import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alarms } from "../components/frame/Alarms";
import { collectIncome } from "../game/actions";
import { enactForEval, openAssembly } from "../game/assembly";
import {
  ACTIVE_EFFECT_KINDS,
  countActiveEffectsByKind,
  getActiveEffects,
  type ActiveEffectDescriptor,
} from "../game/activeEffects";
import { YEAR_CARDS } from "../game/data";
import { calculateIncomeBreakdown } from "../game/economy/income";
import { projectForPlayer } from "../game/projection";
import { revealYearCard, startNewYear } from "../game/year";
import { materialTile, scenario } from "../game/testing/scenario";
import type { HegemonyState, Pops, YearCard } from "../game/types";
import { PLAYER_IDS } from "../game/data";
import { unrestStatus } from "../game/unrest";
import { masterPolicy, projectPolicyHorizon } from "../sim/policies";
import { createSimRng } from "../sim/rng";
import { snapshotTurn } from "../sim/telemetry";
import { presentActiveEffect, presentActiveEffects } from "../ui/effects";
import { allocateEntityId } from "../game/entity";

const EMPTY_POPS: Pops = { citizens: 0, freemen: 0, slaves: 0 };

function stateWithSettlement(pops: Pops = EMPTY_POPS): HegemonyState {
  const G = scenario().build();
  const target = materialTile(G);
  target.settlements.push({
    id: allocateEntityId(G, "settlement"),
    tileId: target.id,
    owner: "0",
    kind: "capital",
    buildings: [],
    pops: { ...pops },
  });
  G.players["0"].settlements.push(target.id);
  G.phase = "gameplay";
  G.currentPlayer = "0";
  return G;
}

function yearCard(id: string): YearCard {
  const card = YEAR_CARDS.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`no year card ${id}`);
  return card;
}

function plantLaw(G: HegemonyState, cardId: string, author: "0" | "1" = "0") {
  G.activeLaws.push({
    cardId,
    author,
    enactedYear: G.year,
    order: G.lawOrder++,
  });
}

function renderAlarms(G: HegemonyState, activeEffects: ActiveEffectDescriptor[]): string {
  return renderToStaticMarkup(
    createElement(Alarms, {
      content: G.definition.content,
      effects: activeEffects,
      riotThreshold: G.ruleset.economy.unrest.riotThreshold,
      unrest: unrestStatus(G, "0"),
    }),
  );
}

function effectByKind(
  G: HegemonyState,
  kind: ActiveEffectDescriptor["kind"],
  playerID: "0" | "1" = "0",
) {
  return getActiveEffects(G, playerID).filter((effect) => effect.kind === kind);
}

describe("canonical active-effect selector", () => {
  it("reports source, scope, mechanics, duration, and expiry for persistent state", () => {
    const G = stateWithSettlement({ citizens: 10, freemen: 0, slaves: 0 });
    G.players["0"].incomeSuppressedTurns = 1;
    G.activeYearCard = yearCard("year-piracy");
    G.activeLaws.push({
      cardId: "land-reform",
      author: "0",
      enactedYear: G.year,
      order: G.lawOrder++,
    });
    G.pendingIsonomiaTarget = "0";

    // A strike eats nothing, so the hunger warning waits for it to end: read the
    // struck state and the same state once the strike is over.
    const working = structuredClone(G);
    working.players["0"].incomeSuppressedTurns = 0;
    const effects = [...getActiveEffects(G, "0"), ...getActiveEffects(working, "0")];
    const kinds = new Set(effects.map((effect) => effect.kind));
    expect(effectByKind(G, "hunger")).toHaveLength(0);

    expect(kinds).toEqual(
      new Set(["incomeSuppression", "hunger", "yearCard", "standingLaw", "nextAssembly"]),
    );

    for (const effect of effects) {
      expect(effect.source.label.trim(), effect.id).not.toBe("");
      expect(effect.mechanics.length, effect.id).toBeGreaterThan(0);
      expect(effect.duration.expiry, effect.id).toBeTypeOf("string");
      expect(effect.scope.kind, effect.id).toBeTypeOf("string");
    }
  });

  it("describes the year's card for every seat, and the income engine takes the same term", () => {
    const G = stateWithSettlement({ citizens: 0, freemen: 2, slaves: 0 });
    G.activeYearCard = yearCard("year-piracy");

    for (const playerID of ["0", "1"] as const) {
      const descriptor = effectByKind(G, "yearCard", playerID)[0];
      expect(descriptor.scope).toEqual({ kind: "allPlayers" });
      expect(descriptor.mechanics).toEqual([{ type: "zeroTerm", term: "freemenGold" }]);
      expect(descriptor.duration.expiry).toBe("atYearEnd");
    }

    const taken = calculateIncomeBreakdown(G, "0")
      .filter((line) => line.detail.startsWith("Piracy") && line.resource === "gold")
      .reduce((sum, line) => sum + line.amount, 0);
    expect(taken).toBe(-2);
  });

  it("expires income suppression at the lifecycle boundary it declares", () => {
    const G = stateWithSettlement();
    G.players["0"].incomeSuppressedTurns = 1;

    expect(effectByKind(G, "incomeSuppression")[0].duration.expiry).toBe("afterIncomeCollections");
    collectIncome(G, "0", "automatic");
    expect(effectByKind(G, "incomeSuppression")).toHaveLength(0);
  });

  it("turns Plague into one Unrest token for everyone and leaves nothing standing", () => {
    const plague = yearCard("year-plague");
    const G = stateWithSettlement();
    G.activeYearCard = null;
    G.yearDrawPile = [plague];

    revealYearCard(G);

    // Nothing is left ticking: the token is the whole effect, and it is board state.
    expect(PLAYER_IDS.map((playerID) => G.players[playerID].unrestTokens)).toEqual([1, 1, 1, 1]);
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === plague.id)).toBe(false);
  });

  it("expires year-card, Law, and Isonomia descriptors through their engine lifecycles", () => {
    const G = stateWithSettlement();
    G.activeYearCard = yearCard("year-piracy");
    const yearCardId = effectByKind(G, "yearCard")[0].id;

    startNewYear(G);
    expect(getActiveEffects(G, "0").some((effect) => effect.id === yearCardId)).toBe(false);

    plantLaw(G, "land-reform");
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === "land-reform")).toBe(
      true,
    );
    enactForEval(G, { kind: "repeal", cardId: "land-reform", proposer: "0" });
    expect(getActiveEffects(G, "0").some((effect) => effect.source.id === "land-reform")).toBe(
      false,
    );

    G.pendingIsonomiaTarget = "0";
    expect(effectByKind(G, "nextAssembly")).toHaveLength(1);
    openAssembly(G, "0");
    expect(G.assembly?.isonomiaTarget).toBe("0");
    expect(effectByKind(G, "nextAssembly")).toHaveLength(0);
  });
});

describe("persistent event content inventory", () => {
  it("projects every year card that zeroes a term, and no card that acts once", () => {
    let exercised = 0;

    for (const card of YEAR_CARDS) {
      const G = stateWithSettlement({ citizens: 2, freemen: 1, slaves: 0 });
      G.activeYearCard = card;
      const descriptors = getActiveEffects(G, "0").filter(
        (effect) => effect.source.kind === "yearCard" && effect.source.id === card.id,
      );

      expect(descriptors, card.id).toHaveLength(card.effect.type === "zeroTerm" ? 1 : 0);
      exercised += descriptors.length;
    }

    expect(exercised).toBeGreaterThan(0);
  });
});

describe("frontend active-effect parity", () => {
  it("renders the same canonical words through the realm's alarms", () => {
    const G = stateWithSettlement();
    G.players["0"].incomeSuppressedTurns = 1;
    const descriptors = getActiveEffects(G, "0");
    const alarms = renderAlarms(G, descriptors);

    expect(alarms).toContain('class="alarms"');
    for (const descriptor of descriptors) {
      if (descriptor.kind === "yearCard" || descriptor.kind === "standingLaw") continue;
      expect(alarms).toContain(presentActiveEffect(descriptor).accessibleText);
    }
  });

  it("preserves every scoped Law qualifier in the shared frontend presentation", () => {
    const G = stateWithSettlement();
    plantLaw(G, "guild-charter");
    plantLaw(G, "master-builders");
    const presentations = presentActiveEffects(getActiveEffects(G, "0"));
    const guild = presentations.find((effect) => effect.source === "Guild Charter")!;
    const builders = presentations.find((effect) => effect.source === "Master Builders")!;

    expect(guild.text).toContain("grow pop in cities: -3 Food cost");
    expect(guild.text).toContain("grow pop in colonies: +2 Food cost");
    for (const building of ["Temple", "Forum"]) {
      expect(builders.text).toContain(building);
    }
  });
});

describe("simulation and AI active-effect parity", () => {
  it("clearly avoids skipped income by removing suppressed collections from its horizon", () => {
    const safe = stateWithSettlement({ citizens: 0, freemen: 1, slaves: 0 });
    const struck = structuredClone(safe);
    struck.players["0"].incomeSuppressedTurns = 1;

    const safeProjection = projectPolicyHorizon(safe, "0", 2);
    const struckProjection = projectPolicyHorizon(struck, "0", 2);

    expect(struckProjection.resources.gold).toBeLessThan(safeProjection.resources.gold);
  });

  it("does not buy this year's calm to cover an upkeep in a later year", () => {
    const choose = (slaves: number) => {
      const G = stateWithSettlement({ citizens: 0, freemen: 0, slaves });
      G.players["0"].collectedThisTurn = true;
      Object.assign(G.players["0"].resources, {
        wood: 0,
        stone: 0,
        gold: 0,
        food: 0,
        influence: 4,
      });

      return masterPolicy.choose(
        projectForPlayer(G.definition, G, "0"),
        [{ type: "civicCalm", payment: "influence" }, { type: "endTurn" }],
        createSimRng(1),
      );
    };

    // Calm will have expired before the next upkeep, even on the riot line.
    expect(choose(6).type).toBe("endTurn");
    expect(choose(0).type).toBe("endTurn");
  });

  it("uses the known year card only for an income still owed this year", () => {
    const G = stateWithSettlement({ citizens: 0, freemen: 2, slaves: 0 });
    G.activeYearCard = yearCard("year-piracy");
    const before = G.players["0"].resources.gold;
    G.players["0"].collectedThisTurn = false;
    expect(projectPolicyHorizon(G, "0", 2).resources.gold).toBe(before + 2);
    G.players["0"].collectedThisTurn = true;
    expect(projectPolicyHorizon(G, "0", 2).resources.gold).toBe(before + 4);
  });

  it("handles the safe edge and the hunger edge deterministically", () => {
    const safe = stateWithSettlement();
    const hungry = stateWithSettlement({ citizens: 10, freemen: 0, slaves: 0 });
    // Ten mouths against eight stored food: two go unfed at the first income.
    hungry.players["0"].resources.food = 8;

    expect(projectPolicyHorizon(safe, "0", 1).expectedStarvationPopLoss).toBe(0);
    expect(projectPolicyHorizon(hungry, "0", 1).expectedStarvationPopLoss).toBe(2);
  });

  it("recalculates food after projected hunger and matches the engine on the review case", () => {
    const G = stateWithSettlement({ citizens: 0, freemen: 3, slaves: 0 });
    const engine = structuredClone(G);
    // No event cards: the review case is income alone.
    engine.playerDrawPile = [];
    engine.playerDiscardPile = [];

    for (let income = 0; income < 6; income += 1) {
      engine.players["0"].collectedThisTurn = false;
      expect(collectIncome(engine, "0").ok).toBe(true);
    }

    // Twelve food feeds three freemen for four incomes; the fifth leaves all three unfed.
    const actual = engine.players["0"].popsLostToHunger;
    expect(actual).toBe(3);
    expect(projectPolicyHorizon(G, "0", 6).expectedStarvationPopLoss).toBe(actual);
  });
  it("records the selector's exhaustive kind counts in snapshots", () => {
    const G = stateWithSettlement();
    G.players["0"].incomeSuppressedTurns = 1;
    const expected = countActiveEffectsByKind(getActiveEffects(G, "0"));
    const snapshot = snapshotTurn(G, 0, G.seed);

    expect(snapshot.players["0"].activeEffects).toEqual(expected);
    expect(Object.keys(snapshot.players["0"].activeEffects)).toEqual([...ACTIVE_EFFECT_KINDS]);
  });
});
