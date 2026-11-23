import { describe, expect, it } from "vitest";
import { getAuthoredGameContent } from "../../../game/content";
import { presentEventEffects } from "../../../ui/effects";
import { ceremonyMood, devDrawCommit, fateCommit } from "./ceremonyMood";

/**
 * A drawn card's commit names what it does, with the icon of what it acts on, read off
 * the card's typed effect: a new card gets its words without a hand-written label.
 */
const content = getAuthoredGameContent();

describe("a drawn card's commit", () => {
  it("names every fate's effect with its icon", () => {
    for (const card of content.playerEvents) {
      const label = fateCommit(card.effects, ceremonyMood(presentEventEffects(card.effects).tone));
      expect(label.icon, card.name).toBeTruthy();
      expect(label.noun, card.name).toBeTruthy();
    }
    const calm = content.playerEvents.find((card) => card.id === "player-public-calm")!;
    expect(fateCommit(calm.effects, "gift")).toEqual({
      verb: "Clear the",
      icon: "unrest/unrest",
      noun: "Unrest",
    });
  });

  it("takes a yield's resource and keeps any other development card", () => {
    for (const card of content.devCards) {
      const label = devDrawCommit(card);
      expect(label.icon, card.name).toBeTruthy();
      expect(label.verb, card.name).toBe(card.kind === "yield" ? "Take the" : "Keep the");
    }
  });
});
