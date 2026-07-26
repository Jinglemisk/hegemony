# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-07-26.

## Q39 — What is the initial Voice minimum?

**Context:** Phase 3.5 changes Voice of the Assembly to a permanent
authored-and-passed ratchet. The owner has settled first-to-reach ownership and
strict-exceed takeover, but not the minimum count required before anyone can hold it.

**Options:** Minimum 2 (earlier political race), 3 (Catan-style meaningful threshold),
or a higher dial validated in simulation.

**Recommendation:** Start at 3. It prevents the first successful resolution from
immediately awarding a victory card and remains a ruleset dial for Step 5 tuning.

**Answer:**

## Q31 — Should coastal luxuries use a feature ring or real tiles?

**Context:** Coastal goods need board locations without accidentally adding naval
movement, settlement slots, or a second map ruleset.

**Options:** Unsettleable feature ring attached to rim edges, or full coastal tiles.

**Recommendation:** Use the feature ring. A Port in an adjacent settlement claims
the feature; the feature itself has no slots and cannot be settled.

**Answer:**

## Q32 — Is the luxury roster and provisional Port price accepted?

**Context:** The plan defines nine named goods and a provisional Port cost of
20 wood, 5 stone, and 10 gold.

**Options:** Approve both as tunable defaults, or revise the roster/cost before design.

**Recommendation:** Approve the roster and keep the provisional price until the
Phase 4 simulation and human validation gate.

**Answer:**

## Q43 — How do luxuries affect happiness?

**Context:** A permanent standing offset, recurring happiness income, and shifted
riot thresholds produce materially different games.

**Options:** Standing `effective = stored + 2 × active`; +2 happiness income per
good each turn; or move riot thresholds by 2 per good.

**Recommendation:** Use the standing offset. It relieves unrest without banking
unbounded happiness or silently buying the Beloved victory card.

**Answer:**

## Q44 — Do luxuries count toward Beloved of the People?

**Context:** Beloved currently reads stored happiness. Three luxuries could otherwise
contribute 6 of the card's 10-point minimum.

**Options:** Count effective happiness, or keep the card on stored happiness only.

**Recommendation:** Stored happiness only; luxuries are protective infrastructure,
not banked public contentment.

**Answer:**

## Q45 — What are the monopoly and cap rules?

**Context:** Unique goods make a duplicate bonus unreachable, and uncapped ownership
could retire unrest for the leader.

**Options:** Unique global goods with an active cap; repeatable goods with diminishing
returns; or per-player allocations.

**Recommendation:** Keep every good unique, cap active goods at 3 per player, allow
surplus ownership as inactive trade inventory, and make the three land goods a
first-come global race.

**Answer:**

## Q46 — What is the Trader's price and placement rule?

**Context:** The Trader is the intended gold sink. At 100 gold it costs roughly five
to six turns of a mid-game gold income and competes directly with Treasurer.

**Options:** Normal one-slot building in any settlement at 100 gold, or a cheaper or
location-gated special structure.

**Recommendation:** Use a normal `maxLevel: 1` building in any settlement and keep
100 gold as the authored, sim-tunable default.

**Answer:**

## Q47 — May the Port be location-gated?

**Context:** The Port would be the first building forbidden by settlement location;
allowing it inland would create a legal but useless resource trap.

**Options:** Require a coastal-adjacent settlement, or allow construction anywhere
while only coastal Ports claim goods.

**Recommendation:** Make the Port the explicit exception and return an authoritative
blocked reason on inland settlements.

**Answer:**

## Q48 — Should luxury denial ship now or only its state seam?

**Context:** Blockade and denial fit player-targeted Stratokles Directives, but adding
those cards during the luxury slice would couple two balancing passes.

**Options:** Ship suppression state only; ship a Directive immediately; or defer all
denial modeling.

**Recommendation:** Include `active` and `suppressedTurns` on claims, then add denial
content only during a later Assembly deck pass.

**Answer:**

## Q49 — Are luxury goods tradable?

**Context:** A unique owned object creates a meaningful monopoly currency without
making influence or happiness directly tradable.

**Options:** Tradable with player trade, permanently bound to the claimant, or defer
the transfer rule until trade v2.

**Recommendation:** Make claims transferable in the model, while allowing the first
luxury slice to ship before the player-trade interface.

**Answer:**

## Q33 — What shape should player trade v1 take?

**Context:** Bank rates set the price corridor; influence and happiness remain
non-tradable. Negotiation UI and AI opponent modeling are the expensive parts.

**Options:** Structured named-player offers, free-form negotiation, or defer trade.

**Recommendation:** Structured bundles of materials and claimed luxuries with
accept/decline and no counter-offer flow in v1.

**Answer:**

## Q34 — What is the National Ideas draft?

**Context:** Seat asymmetry should use existing rule seams and avoid permanently
assigning an overpowered identity to a player.

**Options:** Public reverse-order draft, random assignment, or fixed seat powers.

**Recommendation:** Eight public ruleset-patch ideas, one per player, snake-drafted
after placement in reverse placement order. Validate that none is an automatic pick.

**Answer:**

## Q35 — What belongs in the setup and multiplayer slice?

**Context:** Modes and seeds already exist as ruleset/URL inputs, while networking and
2–3-player scaling require separate architecture and balance work.

**Options:** Local setup screen only; bundle networking; or leave URL-only setup.

**Recommendation:** Build a local pre-game screen for mode, board, seed, and names.
Keep networking and 2–3-player scaling out until each has an accepted plan.

**Answer:**

## Q30 — Should the d6 omen grow into a d20 yearly table?

**Context:** The current symmetric d6 omen already uses the shared event-table engine.
The older d20 idea adds substantially more annual content but no current phase needs it.

**Options:** Plan a d20 table after Phase 3.5, keep the compact d6 permanently, or
defer the decision until the current omen has human evidence.

**Recommendation:** Validate the d6 first and design a d20 expansion only if annual
variety proves too thin.

**Answer:**

## Q50 — Are the current d6 omen numbers acceptable?

**Context:** Each year rolls one table-wide, year-long income modifier: −1 food,
gold, or wood; or +1 food, stone, or gold. The table is deliberately symmetric and
near zero expected value but has never received the owner's qualitative verdict.

**Options:** Accept the six ±1 rows, revise individual resources, or replace the
table through Q30.

**Recommendation:** Keep the ±1 magnitude; judge only whether the resource mix feels
thematic during the Phase 3.5 human playtest.

**Answer:**
